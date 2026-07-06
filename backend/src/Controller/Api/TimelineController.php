<?php
declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Application;
use App\Entity\Campaign;
use App\Entity\TimelineEvent;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Lecture de la timeline d'audit d'une candidature.
 * Accès : uniquement le candidat concerné ou le propriétaire de la campagne.
 */
#[Route('/api/applications')]
final class TimelineController extends AbstractController
{
    #[Route('/{id}/timeline', methods: ['GET'])]
    public function timeline(string $id, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        $app = $em->getRepository(Application::class)->find($id);
        if (!$app) return $this->json(['error' => 'Candidature introuvable.'], 404);

        /** @var User $user */
        $user     = $sec->getUser();
        $campaign = $em->getRepository(Campaign::class)->find($app->getCampaignId());

        $isCandidate = $app->belongsToCandidate($user->getId());
        $isOwner     = $campaign && $campaign->isOwner($user->getId());
        if (!$isCandidate && !$isOwner) {
            return $this->json(['error' => 'Accès refusé.'], 403);
        }

        $events = $em->getRepository(TimelineEvent::class)->findBy(
            ['applicationId' => $app->getId()],
            ['createdAt' => 'DESC'],
            100
        );

        // Niveaux de visibilité (spec) : le candidat ne voit JAMAIS l'interne
        // (owner_only, agency_internal) ; le propriétaire voit tout.
        $events = array_values(array_filter($events, function (TimelineEvent $e) use ($isOwner) {
            if ($isOwner) return true;
            return in_array($e->getVisibility(), ['all', 'candidate_visible'], true);
        }));

        return $this->json([
            'data' => array_map(fn(TimelineEvent $e) => [
                'id'        => $e->getId(),
                'type'      => $e->getType(),
                'message'   => $e->getMessage(),
                'actorRole' => $e->getActorRole(),
                'oldValue'  => $e->getOldValue(),
                'newValue'  => $e->getNewValue(),
                'createdAt' => $e->getCreatedAt()->format('c'),
            ], $events),
        ]);
    }
}
