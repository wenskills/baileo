<?php
declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Application;
use App\Entity\Assignment;
use App\Entity\AuditLog;
use App\Entity\Campaign;
use App\Entity\InternalComment;
use App\Entity\User;
use App\Service\ActivityService;
use App\Service\OrganizationPermissionService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Collaboration d'équipe sur une candidature :
 *  - Assignation (« qui traite quoi ») — manager+
 *  - Commentaires internes — membres actifs, JAMAIS visibles du candidat
 * Toutes les actions sont auditées.
 */
#[Route('/api')]
final class CollaborationController extends AbstractController
{
    public function __construct(
        private readonly OrganizationPermissionService $perms,
        private readonly ActivityService $activity,
    ) {}

    /** @return array{0: ?Application, 1: ?Campaign, 2: ?string, 3: ?JsonResponse} app, campaign, orgId, erreur */
    private function resolveTeamAccess(string $applicationId, EntityManagerInterface $em, Security $sec, string $minRole): array
    {
        $app = $em->getRepository(Application::class)->find($applicationId);
        if (!$app) return [null, null, null, $this->json(['error' => ['code' => 'RESOURCE_NOT_FOUND', 'message' => 'Candidature introuvable.']], 404)];

        $campaign = $em->getRepository(Campaign::class)->find($app->getCampaignId());
        if (!$campaign) return [null, null, null, $this->json(['error' => ['code' => 'RESOURCE_NOT_FOUND', 'message' => 'Campagne introuvable.']], 404)];

        /** @var User $user */
        $user  = $sec->getUser();
        $orgId = $campaign->getOrganizationId();

        // Propriétaire direct : toujours autorisé. Sinon : membre de l'organisation avec le rôle requis.
        $allowed = $campaign->isOwner($user->getId())
            || ($orgId && $this->perms->hasAtLeast($user, $orgId, $minRole));
        if (!$allowed) {
            return [null, null, null, $this->json(['error' => ['code' => 'ORGANIZATION_PERMISSION_DENIED', 'message' => 'Accès refusé.']], 403)];
        }
        return [$app, $campaign, $orgId, null];
    }

    // ── POST /api/applications/{id}/assign {userId} — manager+ ──
    #[Route('/applications/{id}/assign', methods: ['POST'])]
    public function assign(string $id, Request $request, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        [$app, $campaign, $orgId, $err] = $this->resolveTeamAccess($id, $em, $sec, 'manager');
        if ($err) return $err;
        /** @var User $user */
        $user = $sec->getUser();

        $decoded  = json_decode($request->getContent(), true);
        $targetId = (string) ((is_array($decoded) ? $decoded : [])['userId'] ?? '');
        if (!$targetId) return $this->json(['error' => ['code' => 'VALIDATION_ERROR', 'message' => 'userId requis.']], 422);

        // La cible doit pouvoir traiter le dossier (agent minimum, ou le propriétaire lui-même)
        $target = $em->getRepository(User::class)->find($targetId);
        $targetOk = $target && (
            $campaign->isOwner($target->getId())
            || ($orgId && $this->perms->hasAtLeast($target, $orgId, 'agent'))
        );
        if (!$targetOk) {
            return $this->json(['error' => ['code' => 'VALIDATION_ERROR', 'message' => 'Ce membre ne peut pas traiter de dossiers (rôle insuffisant).']], 422);
        }

        $existing = $em->getRepository(Assignment::class)->findOneBy(['applicationId' => $app->getId()]);
        $old = $existing?->getAssignedToUserId();
        if ($existing) {
            $existing->setAssignedToUserId($targetId);
        } else {
            $em->persist(new Assignment($app->getId(), $targetId, $user->getId()));
        }

        $this->activity->log($app->getId(), 'note_added',
            'Dossier assigné à ' . $target->getFirstName() . ' ' . mb_substr($target->getLastName(), 0, 1) . '.',
            $user->getId(), 'owner', null, null, 'agency_internal');
        $this->activity->notify($targetId, 'status_changed', 'Dossier assigné',
            'Le dossier de la campagne « ' . $campaign->getTitle() . ' » vous a été assigné.',
            '/candidatures/' . $app->getId());
        $em->persist(new AuditLog('application', $app->getId(), 'assigned', $user->getId(), $orgId, $old, $targetId));
        $em->flush();

        return $this->json(['assignedTo' => $targetId], 201);
    }

    // ── DELETE /api/applications/{id}/assign — manager+ ──
    #[Route('/applications/{id}/assign', methods: ['DELETE'])]
    public function unassign(string $id, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        [$app, $campaign, $orgId, $err] = $this->resolveTeamAccess($id, $em, $sec, 'manager');
        if ($err) return $err;
        /** @var User $user */
        $user = $sec->getUser();

        $existing = $em->getRepository(Assignment::class)->findOneBy(['applicationId' => $app->getId()]);
        if ($existing) {
            $em->persist(new AuditLog('application', $app->getId(), 'unassigned', $user->getId(), $orgId, $existing->getAssignedToUserId(), null));
            $em->remove($existing);
            $em->flush();
        }
        return $this->json(['assignedTo' => null]);
    }

    // ── GET /api/assignments/me — mes dossiers assignés ──
    #[Route('/assignments/me', methods: ['GET'])]
    public function myAssignments(EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user = $sec->getUser();
        $rows = $em->getRepository(Assignment::class)->findBy(['assignedToUserId' => $user->getId()], ['createdAt' => 'DESC'], 100);

        $data = [];
        foreach ($rows as $a) {
            $app = $em->getRepository(Application::class)->find($a->getApplicationId());
            if (!$app) continue;
            $campaign  = $em->getRepository(Campaign::class)->find($app->getCampaignId());
            $candidate = $em->getRepository(User::class)->find($app->getCandidateId());
            $data[] = [
                'applicationId' => $app->getId(),
                'status'        => $app->getStatus(),
                'campaignTitle' => $campaign?->getTitle(),
                'candidateName' => $candidate ? $candidate->getFirstName() . ' ' . mb_substr($candidate->getLastName(), 0, 1) . '.' : 'Candidat',
                'assignedAt'    => $a->getCreatedAt()->format('c'),
            ];
        }
        return $this->json(['data' => $data]);
    }

    // ── GET /api/applications/{id}/internal-comments — membres (viewer+) ──
    #[Route('/applications/{id}/internal-comments', methods: ['GET'])]
    public function comments(string $id, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        [$app, $campaign, $orgId, $err] = $this->resolveTeamAccess($id, $em, $sec, 'viewer');
        if ($err) return $err;

        $rows = $em->getRepository(InternalComment::class)->findBy(['applicationId' => $app->getId()], ['createdAt' => 'ASC'], 200);
        $data = [];
        foreach ($rows as $cm) {
            $author = $em->getRepository(User::class)->find($cm->getAuthorId());
            $data[] = [
                'id'        => $cm->getId(),
                'author'    => $author ? $author->getFirstName() . ' ' . mb_substr($author->getLastName(), 0, 1) . '.' : 'Membre',
                'body'      => $cm->getBody(),
                'createdAt' => $cm->getCreatedAt()->format('c'),
                'mine'      => $cm->getAuthorId() === $sec->getUser()->getId(),
            ];
        }
        return $this->json(['data' => $data]);
    }

    // ── POST /api/applications/{id}/internal-comments — agent+ ──
    #[Route('/applications/{id}/internal-comments', methods: ['POST'])]
    public function addComment(string $id, Request $request, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        [$app, $campaign, $orgId, $err] = $this->resolveTeamAccess($id, $em, $sec, 'agent');
        if ($err) return $err;
        /** @var User $user */
        $user = $sec->getUser();

        $decoded = json_decode($request->getContent(), true);
        $body    = trim((string) ((is_array($decoded) ? $decoded : [])['body'] ?? ''));
        if ($body === '') return $this->json(['error' => ['code' => 'VALIDATION_ERROR', 'message' => 'Le commentaire ne peut pas être vide.']], 422);

        $comment = new InternalComment($app->getId(), $orgId ?? ($campaign->getOrganizationId() ?? 'personal'), $user->getId(), $body);
        $em->persist($comment);
        $em->persist(new AuditLog('application', $app->getId(), 'internal_comment_added', $user->getId(), $orgId));
        $em->flush();

        return $this->json([
            'id'        => $comment->getId(),
            'author'    => $user->getFirstName() . ' ' . mb_substr($user->getLastName(), 0, 1) . '.',
            'body'      => $comment->getBody(),
            'createdAt' => $comment->getCreatedAt()->format('c'),
            'mine'      => true,
        ], 201);
    }

    // ── DELETE /api/internal-comments/{id} — auteur ou admin ──
    #[Route('/internal-comments/{id}', methods: ['DELETE'])]
    public function deleteComment(string $id, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user    = $sec->getUser();
        $comment = $em->getRepository(InternalComment::class)->find($id);
        if (!$comment) return $this->json(['error' => ['code' => 'RESOURCE_NOT_FOUND', 'message' => 'Commentaire introuvable.']], 404);

        $isAuthor = $comment->getAuthorId() === $user->getId();
        $isAdmin  = $comment->getOrganizationId() !== 'personal'
            && $this->perms->canAdminister($user, $comment->getOrganizationId());
        if (!$isAuthor && !$isAdmin) {
            return $this->json(['error' => ['code' => 'FORBIDDEN', 'message' => 'Seul l\'auteur ou un administrateur peut supprimer.']], 403);
        }
        $em->remove($comment);
        $em->flush();
        return $this->json(['removed' => true]);
    }
}
