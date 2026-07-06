<?php
declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Application;
use App\Entity\AuditLog;
use App\Entity\Campaign;
use App\Entity\CampaignFollowLink;
use App\Entity\User;
use App\Entity\VisitBooking;
use App\Entity\VisitSlot;
use App\Service\OrganizationPermissionService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Suivi propriétaire (spec Wendy) : l'agence donne au PROPRIÉTAIRE RÉEL du
 * bien un accès de suivi en lecture seule sur l'avancement de la mise en
 * location. Le lien expose UNIQUEMENT des compteurs et jalons — jamais
 * l'identité des candidats, jamais les notes internes.
 */
#[Route('/api')]
final class FollowLinkController extends AbstractController
{
    public function __construct(private readonly OrganizationPermissionService $perms) {}

    // ── POST /api/campaigns/{id}/follow-link {ownerName} — manager+ ──
    #[Route('/campaigns/{id}/follow-link', methods: ['POST'])]
    public function create(string $id, Request $request, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        $campaign = $em->getRepository(Campaign::class)->find($id);
        if (!$campaign) return $this->json(['error' => ['code' => 'RESOURCE_NOT_FOUND', 'message' => 'Campagne introuvable.']], 404);

        /** @var User $user */
        $user = $sec->getUser();
        $allowed = $campaign->isOwner($user->getId())
            || ($campaign->getOrganizationId() && $this->perms->hasAtLeast($user, $campaign->getOrganizationId(), 'manager'));
        if (!$allowed) return $this->json(['error' => ['code' => 'ORGANIZATION_PERMISSION_DENIED', 'message' => 'Réservé aux managers.']], 403);

        $decoded   = json_decode($request->getContent(), true);
        $ownerName = (string) ((is_array($decoded) ? $decoded : [])['ownerName'] ?? '');
        if (trim($ownerName) === '') {
            return $this->json(['error' => ['code' => 'VALIDATION_ERROR', 'message' => 'Le nom du propriétaire est requis.']], 422);
        }

        $link = new CampaignFollowLink($campaign->getId(), $ownerName, $user->getId());
        $em->persist($link);
        $em->persist(new AuditLog('campaign', $campaign->getId(), 'follow_link_created', $user->getId(), $campaign->getOrganizationId(), null, $link->getOwnerName()));
        $em->flush();

        return $this->json(['id' => $link->getId(), 'ownerName' => $link->getOwnerName(), 'link' => '/suivi/' . $link->getToken()], 201);
    }

    // ── GET /api/campaigns/{id}/follow-links — liste (manager+) ──
    #[Route('/campaigns/{id}/follow-links', methods: ['GET'])]
    public function list(string $id, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        $campaign = $em->getRepository(Campaign::class)->find($id);
        if (!$campaign) return $this->json(['error' => ['code' => 'RESOURCE_NOT_FOUND', 'message' => 'Campagne introuvable.']], 404);
        /** @var User $user */
        $user = $sec->getUser();
        $allowed = $campaign->isOwner($user->getId())
            || ($campaign->getOrganizationId() && $this->perms->hasAtLeast($user, $campaign->getOrganizationId(), 'manager'));
        if (!$allowed) return $this->json(['error' => ['code' => 'ORGANIZATION_PERMISSION_DENIED', 'message' => 'Accès refusé.']], 403);

        $links = $em->getRepository(CampaignFollowLink::class)->findBy(['campaignId' => $id], ['createdAt' => 'DESC']);
        return $this->json(['data' => array_map(fn(CampaignFollowLink $l) => [
            'id'        => $l->getId(),
            'ownerName' => $l->getOwnerName(),
            'status'    => $l->getStatus(),
            'link'      => '/suivi/' . $l->getToken(),
            'createdAt' => $l->getCreatedAt()->format('c'),
        ], $links)]);
    }

    // ── POST /api/follow-links/{id}/revoke — manager+ ──
    #[Route('/follow-links/{id}/revoke', methods: ['POST'])]
    public function revoke(string $id, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        $link = $em->getRepository(CampaignFollowLink::class)->find($id);
        if (!$link) return $this->json(['error' => ['code' => 'RESOURCE_NOT_FOUND', 'message' => 'Lien introuvable.']], 404);
        $campaign = $em->getRepository(Campaign::class)->find($link->getCampaignId());
        /** @var User $user */
        $user = $sec->getUser();
        $allowed = $campaign && ($campaign->isOwner($user->getId())
            || ($campaign->getOrganizationId() && $this->perms->hasAtLeast($user, $campaign->getOrganizationId(), 'manager')));
        if (!$allowed) return $this->json(['error' => ['code' => 'ORGANIZATION_PERMISSION_DENIED', 'message' => 'Accès refusé.']], 403);

        $link->revoke();
        $em->flush();
        return $this->json(['status' => 'revoked']);
    }

    // ── GET /api/follow/{token} — PUBLIC (le propriétaire du bien, sans compte) ──
    //    Compteurs et jalons uniquement. Aucune donnée personnelle candidat.
    #[Route('/follow/{token}', methods: ['GET'])]
    public function follow(string $token, EntityManagerInterface $em): JsonResponse
    {
        $link = $em->getRepository(CampaignFollowLink::class)->findOneBy(['token' => $token]);
        if (!$link || !$link->isActive()) {
            return $this->json(['error' => ['code' => 'RESOURCE_NOT_FOUND', 'message' => 'Lien de suivi introuvable ou révoqué.']], 404);
        }
        $campaign = $em->getRepository(Campaign::class)->find($link->getCampaignId());
        if (!$campaign) return $this->json(['error' => ['code' => 'RESOURCE_NOT_FOUND', 'message' => 'Campagne introuvable.']], 404);

        $apps = $em->getRepository(Application::class)->findBy(['campaignId' => $campaign->getId()]);
        $byStatus = [];
        foreach ($apps as $a) $byStatus[$a->getStatus()] = ($byStatus[$a->getStatus()] ?? 0) + 1;

        // Visites : planifiées à venir / réalisées (compteurs)
        $now = new \DateTimeImmutable();
        $visitsUpcoming = 0; $visitsDone = 0;
        foreach ($em->getRepository(VisitSlot::class)->findBy(['campaignId' => $campaign->getId()]) as $slot) {
            foreach ($em->getRepository(VisitBooking::class)->findBy(['slotId' => $slot->getId()]) as $b) {
                if (!in_array($b->getStatus(), ['booked', 'confirmed', 'completed'], true)) continue;
                if ($slot->getEndsAt() < $now) $visitsDone++; else $visitsUpcoming++;
            }
        }

        $active = count(array_filter($apps, fn($a) => !in_array($a->getStatus(), ['refused', 'cancelled', 'withdrawn'], true)));
        $milestone = match (true) {
            ($byStatus['accepted'] ?? 0) > 0   => 'Locataire retenu — bail en préparation',
            ($byStatus['signature'] ?? 0) > 0  => 'Signature en cours',
            ($byStatus['decision'] ?? 0) > 0   => 'Décision en cours',
            $visitsDone > 0                     => 'Visites réalisées — sélection en cours',
            $visitsUpcoming > 0                 => 'Visites planifiées',
            count($apps) > 0                    => 'Candidatures en cours d\'étude',
            default                             => 'En attente de candidatures',
        };

        return $this->json([
            'ownerName'      => $link->getOwnerName(),
            'campaignTitle'  => $campaign->getTitle(),
            'campaignStatus' => $campaign->getStatus(),
            'milestone'      => $milestone,
            'stats'          => [
                'applicationsTotal'  => count($apps),
                'applicationsActive' => $active,
                'documentsStage'     => $byStatus['documents'] ?? 0,
                'visitsUpcoming'     => $visitsUpcoming,
                'visitsDone'         => $visitsDone,
                'decisionStage'      => $byStatus['decision'] ?? 0,
                'accepted'           => $byStatus['accepted'] ?? 0,
            ],
            'updatedAt'      => (new \DateTimeImmutable())->format('c'),
        ]);
    }
}
