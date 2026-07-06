<?php
declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Application;
use App\Entity\Campaign;
use App\Entity\Decision;
use App\Entity\LeaseWorkflow;
use App\Entity\Message;
use App\Entity\User;
use App\Service\ActivityService;
use App\Service\DecisionService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Decision Room (spec Phase 2) :
 *  - GET  : checklist factuelle avant décision (owner only)
 *  - POST : décision formelle — statut, timeline, notification,
 *           message candidat CHOISI (obligatoire pour un refus),
 *           raison interne PRIVÉE, bail préparé si acceptation.
 * Le refus est neutre : aucun motif interne n'est jamais transmis.
 */
#[Route('/api/applications/{id}/decision')]
final class DecisionController extends AbstractController
{
    public function __construct(
        private readonly ActivityService $activity,
        private readonly DecisionService $decisions,
        private readonly \App\Service\OrganizationPermissionService $perms,
    ) {}

    #[Route('', methods: ['GET'])]
    public function get(string $id, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        [$app, $campaign, $err] = $this->authorize($id, $em, $sec);
        if ($err) return $err;

        $existing = $em->getRepository(Decision::class)->findOneBy(['applicationId' => $app->getId()]);
        return $this->json([
            'checklist' => $this->decisions->checklist($app, $campaign),
            'decision'  => $existing ? [
                'decision'         => $existing->getDecision(),
                'candidateMessage' => $existing->getCandidateMessage(),
                'internalReason'   => $existing->getInternalReason(), // owner only : on est déjà authentifié owner
                'createdAt'        => $existing->getCreatedAt()->format('c'),
            ] : null,
        ]);
    }

    #[Route('', methods: ['POST'])]
    public function decide(string $id, Request $request, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        [$app, $campaign, $err] = $this->authorize($id, $em, $sec);
        if ($err) return $err;

        /** @var User $user */
        $user    = $sec->getUser();
        $decoded = json_decode($request->getContent(), true);
        $data    = is_array($decoded) ? $decoded : [];

        $decision        = (string) ($data['decision'] ?? '');
        $candidateMsg    = mb_substr(strip_tags(trim((string) ($data['candidateMessage'] ?? ''))), 0, 2000);
        $internalReason  = (string) ($data['internalReason'] ?? '');

        if ($msg = $this->decisions->validateTransition($app, $decision)) {
            return $this->json(['error' => ['code' => 'INVALID_STATUS_TRANSITION', 'message' => $msg]], 422);
        }
        // Un refus DOIT être accompagné d'un message neutre au candidat (spec)
        if ($decision === 'rejected' && $candidateMsg === '') {
            return $this->json(['error' => ['code' => 'VALIDATION_ERROR', 'message' => 'Un message au candidat est requis pour un refus.']], 422);
        }

        // Enregistrer (ou remplacer) la décision
        $existing = $em->getRepository(Decision::class)->findOneBy(['applicationId' => $app->getId()]);
        if ($existing) $em->remove($existing);
        $record = new Decision($app->getId(), $user->getId(), $decision);
        $record->setCandidateMessage($candidateMsg ?: null)->setInternalReason($internalReason ?: null);
        $em->persist($record);

        // Statut + timeline (résultat visible candidat ; raison interne owner_only)
        $old = $app->getStatus();
        $new = $this->decisions->statusFor($decision);
        $app->setStatus($new);

        $labels = ['accepted' => 'acceptée 🎉', 'rejected' => 'non retenue', 'waitlisted' => 'placée en liste d\'attente', 'cancelled' => 'annulée'];
        $this->activity->log($app->getId(), 'status_changed',
            'Décision : candidature ' . ($labels[$decision] ?? $decision) . '.',
            $user->getId(), 'owner', $old, $new, 'candidate_visible');
        if ($internalReason) {
            $this->activity->log($app->getId(), 'note_added',
                'Raison interne enregistrée (privée).', $user->getId(), 'owner', null, null, 'owner_only');
        }

        // Message candidat choisi → conversation
        if ($candidateMsg !== '') {
            $msg = new Message();
            $msg->setApplicationId($app->getId())
                ->setCampaignId($app->getCampaignId())
                ->setCandidateId($app->getCandidateId())
                ->setSenderId($user->getId())
                ->setSenderRole('owner')
                ->setContent($candidateMsg);
            $em->persist($msg);
        }

        // Notification typée
        $notifTitle = match ($decision) {
            'accepted'   => 'Candidature acceptée 🎉',
            'rejected'   => 'Candidature non retenue',
            'waitlisted' => 'Vous êtes sur liste d\'attente',
            'cancelled'  => 'Candidature annulée',
            default      => 'Décision',
        };
        $this->activity->notify(
            $app->getCandidateId(),
            $decision === 'accepted' ? 'application_accepted' : ($decision === 'rejected' ? 'application_rejected' : 'status_changed'),
            $notifTitle,
            'Concernant « ' . $campaign->getTitle() . ' »' . ($candidateMsg ? ' — un message vous a été envoyé.' : '.'),
            '/mes-candidatures/' . $app->getId()
        );

        // Acceptation → préparer le bail (squelette LeaseWorkflow)
        if ($decision === 'accepted' && !$em->getRepository(LeaseWorkflow::class)->findOneBy(['applicationId' => $app->getId()])) {
            $em->persist(new LeaseWorkflow($app->getId()));
            $this->activity->log($app->getId(), 'status_changed',
                'Préparation du bail initiée.', $user->getId(), 'owner', null, null, 'candidate_visible');
        }

        $em->flush();
        return $this->json(['decision' => $decision, 'status' => $new], 201);
    }

    /** @return array{0: ?Application, 1: ?Campaign, 2: ?JsonResponse} */
    private function authorize(string $id, EntityManagerInterface $em, Security $sec): array
    {
        $app = $em->getRepository(Application::class)->find($id);
        if (!$app) return [null, null, $this->json(['error' => ['code' => 'RESOURCE_NOT_FOUND', 'message' => 'Candidature introuvable.']], 404)];

        $campaign = $em->getRepository(Campaign::class)->find($app->getCampaignId());
        /** @var User $user */
        $user = $sec->getUser();
        $orgOk = $campaign && $campaign->getOrganizationId()
            && $this->perms->hasAtLeast($user, $campaign->getOrganizationId(), 'manager');
        if (!$campaign || (!$campaign->isOwner($user->getId()) && !$orgOk)) {
            // 404 volontaire : le candidat ne doit pas savoir que la salle existe
            return [null, null, $this->json(['error' => ['code' => 'RESOURCE_NOT_FOUND', 'message' => 'Introuvable.']], 404)];
        }
        return [$app, $campaign, null];
    }
}
