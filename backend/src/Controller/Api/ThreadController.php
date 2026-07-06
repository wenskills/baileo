<?php
declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Application;
use App\Entity\Campaign;
use App\Entity\Message;
use App\Entity\User;
use App\Service\ActivityService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Fils de contact SANS candidature (exigence Phase 2 :
 * « contacter le propriétaire ne crée JAMAIS une candidature »).
 *
 * Un fil = (campagne, candidat). Quand le candidat postule ensuite,
 * la conversation de la candidature reprend l'historique du fil
 * (MessageController::list fait l'union).
 */
#[Route('/api')]
final class ThreadController extends AbstractController
{
    public function __construct(
        private readonly RateLimiterFactory $messageLimiter,
        private readonly ActivityService $activity,
    ) {}

    // ─────────────────────────────────────────────────────────────────
    // LIST THREADS — GET /api/threads
    //   Fils SANS candidature associée, avec interlocuteur + dernier message.
    // ─────────────────────────────────────────────────────────────────
    #[Route('/threads', methods: ['GET'])]
    public function listThreads(EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user    = $sec->getUser();
        $isOwner = in_array('ROLE_OWNER', $user->getRoles(), true) || in_array('ROLE_AGENCY', $user->getRoles(), true);

        if ($isOwner) {
            $rows = $em->createQuery(
                'SELECT m.campaignId, m.candidateId, MAX(m.createdAt) AS lastAt
                 FROM App\Entity\Message m
                 JOIN App\Entity\Campaign c WITH c.id = m.campaignId
                 WHERE c.ownerId = :uid AND m.applicationId IS NULL
                 GROUP BY m.campaignId, m.candidateId'
            )->setParameter('uid', $user->getId())->getArrayResult();
        } else {
            $rows = $em->createQuery(
                'SELECT m.campaignId, m.candidateId, MAX(m.createdAt) AS lastAt
                 FROM App\Entity\Message m
                 WHERE m.candidateId = :uid AND m.applicationId IS NULL
                 GROUP BY m.campaignId, m.candidateId'
            )->setParameter('uid', $user->getId())->getArrayResult();
        }

        $data = [];
        foreach ($rows as $row) {
            $campaignId  = $row['campaignId'];
            $candidateId = $row['candidateId'];
            if (!$campaignId || !$candidateId) continue;

            // Si une candidature existe désormais, le fil est absorbé par sa conversation
            $hasApplication = $em->getRepository(Application::class)->findOneBy([
                'campaignId' => $campaignId, 'candidateId' => $candidateId,
            ]);
            if ($hasApplication) continue;

            $campaign = $em->getRepository(Campaign::class)->find($campaignId);
            if (!$campaign) continue;

            // Interlocuteur : l'AUTRE partie, nom minimisé (RGPD)
            $otherId = $isOwner ? $candidateId : $campaign->getOwnerId();
            $other   = $em->getRepository(User::class)->find($otherId);
            $name    = $other
                ? $other->getFirstName() . ' ' . mb_substr($other->getLastName(), 0, 1) . '.'
                : ($isOwner ? 'Candidat' : 'Propriétaire');

            $last = $em->getRepository(Message::class)->findOneBy(
                ['campaignId' => $campaignId, 'candidateId' => $candidateId, 'applicationId' => null],
                ['createdAt' => 'DESC']
            );

            $unread = (int) $em->createQuery(
                'SELECT COUNT(m.id) FROM App\Entity\Message m
                 WHERE m.campaignId = :cid AND m.candidateId = :caid
                   AND m.applicationId IS NULL AND m.read = false AND m.senderId != :me'
            )->setParameter('cid', $campaignId)->setParameter('caid', $candidateId)
             ->setParameter('me', $user->getId())->getSingleScalarResult();

            $data[] = [
                'campaignId'       => $campaignId,
                'candidateId'      => $candidateId,
                'campaignTitle'    => $campaign->getTitle(),
                'interlocutorName' => $name,
                'lastMessage'      => $last ? mb_substr($last->getContent(), 0, 80) : '',
                'lastAt'           => $last?->getCreatedAt()->format('c'),
                'unread'           => $unread,
            ];
        }

        usort($data, fn($a, $b) => strcmp($b['lastAt'] ?? '', $a['lastAt'] ?? ''));
        return $this->json(['data' => $data]);
    }

    // ─────────────────────────────────────────────────────────────────
    // THREAD MESSAGES — GET /api/campaigns/{id}/thread/messages[?candidateId=]
    // ─────────────────────────────────────────────────────────────────
    #[Route('/campaigns/{id}/thread/messages', methods: ['GET'])]
    public function threadMessages(string $id, Request $request, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        [$campaign, $candidateId, $user, $err] = $this->resolveThread($id, $request, $em, $sec);
        if ($err) return $err;

        $messages = $em->getRepository(Message::class)->findBy(
            ['campaignId' => $campaign->getId(), 'candidateId' => $candidateId, 'applicationId' => null],
            ['createdAt' => 'ASC'],
            200
        );

        // Marquer lus les messages reçus
        $dirty = false;
        foreach ($messages as $m) {
            if (!$m->isRead() && $m->getSenderId() !== $user->getId()) { $m->markRead(); $dirty = true; }
        }
        if ($dirty) $em->flush();

        return $this->json(['data' => array_map(fn(Message $m) => [
            'id'        => $m->getId(),
            'content'   => $m->getContent(),
            'isMine'    => $m->getSenderId() === $user->getId(),
            'read'      => $m->isRead(),
            'createdAt' => $m->getCreatedAt()->format('c'),
        ], $messages)]);
    }

    // ─────────────────────────────────────────────────────────────────
    // SEND — POST /api/campaigns/{id}/thread/messages {content, candidateId?}
    // ─────────────────────────────────────────────────────────────────
    #[Route('/campaigns/{id}/thread/messages', methods: ['POST'])]
    public function sendThreadMessage(string $id, Request $request, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        [$campaign, $candidateId, $user, $err] = $this->resolveThread($id, $request, $em, $sec);
        if ($err) return $err;

        $limiter = $this->messageLimiter->create('thread-' . $user->getId());
        if (!$limiter->consume(1)->isAccepted()) {
            return $this->json(['error' => 'Trop de messages envoyés. Patientez un instant.'], 429);
        }

        $decoded = json_decode($request->getContent(), true);
        $content = mb_substr(strip_tags(trim((string) (($decoded['content'] ?? '')))), 0, 5000);
        if ($content === '') return $this->json(['error' => 'Le message ne peut pas être vide.'], 422);

        $isOwner = $campaign->isOwner($user->getId());

        $msg = new Message();
        $msg->setApplicationId(null)
            ->setCampaignId($campaign->getId())
            ->setCandidateId($candidateId)
            ->setSenderId($user->getId())
            ->setSenderRole($isOwner ? 'owner' : 'candidate')
            ->setContent($content);
        $em->persist($msg);

        $recipientId = $isOwner ? $candidateId : $campaign->getOwnerId();
        $this->activity->notify(
            $recipientId, 'message_received', 'Nouveau message',
            $user->getFirstName() . ' : ' . mb_substr($content, 0, 80) . (mb_strlen($content) > 80 ? '…' : ''),
            '/messages?thread=' . $campaign->getId() . ($isOwner ? '&candidate=' . $candidateId : '')
        );
        $em->flush();

        return $this->json([
            'id'        => $msg->getId(),
            'content'   => $msg->getContent(),
            'isMine'    => true,
            'read'      => false,
            'createdAt' => $msg->getCreatedAt()->format('c'),
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────
    /**
     * Résout et autorise le fil : candidat → lui-même ; propriétaire → sa
     * campagne + candidateId requis en paramètre.
     * @return array{0: ?Campaign, 1: ?string, 2: ?User, 3: ?JsonResponse}
     */
    private function resolveThread(string $id, Request $request, EntityManagerInterface $em, Security $sec): array
    {
        $campaign = $em->getRepository(Campaign::class)->find($id)
                  ?? $em->getRepository(Campaign::class)->findOneBy(['slug' => $id]);
        if (!$campaign || !$campaign->isPublished()) {
            return [null, null, null, $this->json(['error' => 'Annonce introuvable ou non publiée.'], 404)];
        }

        /** @var User $user */
        $user    = $sec->getUser();
        $isOwner = $campaign->isOwner($user->getId());

        if ($isOwner) {
            $candidateId = (string) $request->query->get('candidateId', '');
            if (!$candidateId) {
                $decoded = json_decode($request->getContent(), true);
                $candidateId = (string) (is_array($decoded) ? ($decoded['candidateId'] ?? '') : '');
            }
            if (!$candidateId) {
                return [null, null, null, $this->json(['error' => 'candidateId requis.'], 422)];
            }
        } else {
            if (!in_array('ROLE_CANDIDATE', $user->getRoles(), true)) {
                return [null, null, null, $this->json(['error' => 'Accès refusé.'], 403)];
            }
            $candidateId = $user->getId();
        }

        return [$campaign, $candidateId, $user, null];
    }
}
