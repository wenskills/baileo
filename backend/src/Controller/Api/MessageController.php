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
 * Messagerie intégrée par candidature.
 * Seuls les deux participants (candidat + propriétaire de la campagne) peuvent échanger.
 */
#[Route('/api/applications/{applicationId}/messages')]
final class MessageController extends AbstractController
{
    public function __construct(
        private readonly RateLimiterFactory $messageLimiter,
        private readonly ActivityService $activity,
    ) {}

    // ─────────────────────────────────────────────────────────────────
    // LIST — GET /api/applications/{id}/messages
    // ─────────────────────────────────────────────────────────────────
    #[Route('', methods: ['GET'])]
    public function list(string $applicationId, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        [$app, $campaign, $error] = $this->resolveAndAuthorize($applicationId, $em, $sec);
        if ($error) return $error;

        // Union : messages de la candidature + historique du fil de CONTACT
        // antérieur à la candidature (même campagne, même candidat)
        $messages = $em->createQuery(
            'SELECT m FROM App\Entity\Message m
             WHERE m.applicationId = :aid
                OR (m.applicationId IS NULL AND m.campaignId = :cid AND m.candidateId = :caid)
             ORDER BY m.createdAt ASC'
        )->setParameter('aid', $applicationId)
         ->setParameter('cid', $app->getCampaignId())
         ->setParameter('caid', $app->getCandidateId())
         ->setMaxResults(300)
         ->getResult();

        // Marquer lu les messages reçus par cet utilisateur
        /** @var User $user */
        $user = $sec->getUser();
        $isOwner = $campaign->isOwner($user->getId());

        foreach ($messages as $msg) {
            $senderIsOpponent = $isOwner
                ? $msg->getSenderRole() === 'candidate'
                : $msg->getSenderRole() === 'owner';

            if ($senderIsOpponent && !$msg->isRead()) {
                $msg->markRead();
            }
        }
        $em->flush();

        return $this->json(array_map(fn($m) => $this->serialize($m, $user->getId()), $messages));
    }

    // ─────────────────────────────────────────────────────────────────
    // SEND — POST /api/applications/{id}/messages
    // ─────────────────────────────────────────────────────────────────
    #[Route('', methods: ['POST'])]
    public function send(string $applicationId, Request $request, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        [$app, $campaign, $error] = $this->resolveAndAuthorize($applicationId, $em, $sec);
        if ($error) return $error;

        // Bloquer l'envoi sur candidature terminée (RGPD + logique métier)
        if (!$app->isActive()) {
            return $this->json(['error' => 'Impossible d\'envoyer un message sur une candidature clôturée.'], 422);
        }

        /** @var User $user */
        $user = $sec->getUser();

        // Rate limiting : 60 messages/heure par utilisateur
        $limiter = $this->messageLimiter->create($user->getId());
        if (!$limiter->consume(1)->isAccepted()) {
            return $this->json(['error' => 'Trop de messages. Attendez avant d\'en envoyer d\'autres.'], 429);
        }

        $decoded = json_decode($request->getContent(), true);
        $content = trim((string) ($decoded['content'] ?? ''));

        if (!$content) return $this->json(['error' => 'Le message ne peut pas être vide.'], 422);
        if (mb_strlen($content) > 5000) return $this->json(['error' => 'Message trop long (max 5000 caractères).'], 422);
        // Sanitisation : supprimer les balises HTML (pas de rendu HTML côté client de toute façon)
        $content = strip_tags($content);
        if (!$content) return $this->json(['error' => 'Le message ne contient pas de texte valide.'], 422);

        $isOwner    = $campaign->isOwner($user->getId());
        $senderRole = $isOwner ? 'owner' : 'candidate';

        $msg = new Message();
        $msg->setApplicationId($applicationId)
            ->setCampaignId($app->getCampaignId())
            ->setCandidateId($app->getCandidateId())
            ->setSenderId($user->getId())
            ->setSenderRole($senderRole)
            ->setContent($content);

        $em->persist($msg);

        // Timeline : le parcours communication exige la mise à jour de l'historique
        $this->activity->log(
            $applicationId, 'message_sent',
            ($isOwner ? 'Le propriétaire' : 'Le candidat') . ' a envoyé un message.',
            $user->getId(), $senderRole
        );

        // Notifier le destinataire (l'autre partie de la conversation)
        $recipientId = $isOwner ? $app->getCandidateId() : $campaign->getOwnerId();
        $this->activity->notify(
            $recipientId, 'message_received',
            'Nouveau message',
            $user->getFirstName() . ' : ' . mb_substr($content, 0, 80) . (mb_strlen($content) > 80 ? '…' : ''),
            '/messages'
        );

        $em->flush();

        return $this->json($this->serialize($msg, $user->getId()), 201);
    }

    // ─────────────────────────────────────────────────────────────────
    // UNREAD COUNT — GET /api/applications/{id}/messages/unread
    // ─────────────────────────────────────────────────────────────────
    #[Route('/unread', methods: ['GET'])]
    public function unreadCount(string $applicationId, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        [$app, $campaign, $error] = $this->resolveAndAuthorize($applicationId, $em, $sec);
        if ($error) return $error;

        /** @var User $user */
        $user    = $sec->getUser();
        $isOwner = $campaign->isOwner($user->getId());

        $messages = $em->getRepository(Message::class)->findBy([
            'applicationId' => $applicationId,
        ]);

        $unread = count(array_filter($messages, fn($m) =>
            !$m->isRead() &&
            ($isOwner ? $m->getSenderRole() === 'candidate' : $m->getSenderRole() === 'owner')
        ));

        return $this->json(['unread' => $unread]);
    }

    // ─────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────

    /**
     * Résout et autorise l'accès à la conversation.
     * @return array [Application|null, Campaign|null, JsonResponse|null]
     */
    private function resolveAndAuthorize(string $applicationId, EntityManagerInterface $em, Security $sec): array
    {
        $app = $em->getRepository(Application::class)->find($applicationId);
        if (!$app) return [null, null, $this->json(['error' => 'Candidature introuvable.'], 404)];

        $campaign = $em->getRepository(Campaign::class)->find($app->getCampaignId());
        if (!$campaign) return [null, null, $this->json(['error' => 'Campagne introuvable.'], 404)];

        /** @var User $user */
        $user      = $sec->getUser();
        $isOwner   = $campaign->isOwner($user->getId());
        $isCandidate = $app->belongsToCandidate($user->getId());

        if (!$isOwner && !$isCandidate) {
            return [null, null, $this->json(['error' => 'Accès refusé.'], 403)];
        }

        return [$app, $campaign, null];
    }

    private function serialize(Message $m, ?string $currentUserId = null): array
    {
        return [
            'id'            => $m->getId(),
            'applicationId' => $m->getApplicationId(),
            // Ne pas exposer l'UUID interne — utiliser senderRole et isMine
            'senderRole'    => $m->getSenderRole(),
            'isMine'        => $currentUserId !== null && $m->getSenderId() === $currentUserId,
            'content'       => $m->getContent(),
            'read'          => $m->isRead(),
            'readAt'        => $m->getReadAt()?->format('c'),
            'createdAt'     => $m->getCreatedAt()->format('c'),
        ];
    }
}
