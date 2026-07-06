<?php
declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Application;
use App\Entity\Assignment;
use App\Entity\Campaign;
use App\Entity\User;
use App\Service\OrganizationPermissionService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Vue globale agence (spec Wendy : « logiques plus denses ») :
 * toutes les candidatures de l'organisation, multi-campagnes,
 * PAGINÉES et filtrables (statut, campagne, assigné à moi).
 */
#[Route('/api/agency')]
final class AgencyController extends AbstractController
{
    public function __construct(private readonly OrganizationPermissionService $perms) {}

    #[Route('/applications', methods: ['GET'])]
    public function applications(Request $request, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user  = $sec->getUser();
        $orgId = $user->getOrganizationId();
        if (!$orgId || !$this->perms->canView($user, $orgId)) {
            return $this->json(['error' => ['code' => 'ORGANIZATION_PERMISSION_DENIED', 'message' => 'Réservé aux membres de l\'organisation.']], 403);
        }

        $page       = max(1, (int) $request->query->get('page', 1));
        $perPage    = min(50, max(5, (int) $request->query->get('perPage', 15)));
        $status     = (string) $request->query->get('status', '');
        $campaignId = (string) $request->query->get('campaignId', '');
        $mine       = $request->query->get('mine') === '1';

        // Campagnes du périmètre organisation (+ les miennes propres)
        $campaigns = $em->createQuery(
            'SELECT c FROM App\Entity\Campaign c WHERE c.organizationId = :oid OR c.ownerId = :uid'
        )->setParameter('oid', $orgId)->setParameter('uid', $user->getId())->getResult();
        $campaignIds = array_map(fn(Campaign $c) => $c->getId(), $campaigns);
        $titles = [];
        foreach ($campaigns as $c) $titles[$c->getId()] = $c->getTitle();
        if (!$campaignIds) return $this->json(['data' => [], 'total' => 0, 'page' => 1, 'pages' => 1, 'campaigns' => []]);

        $qb = $em->createQueryBuilder()->select('a')->from(Application::class, 'a')
            ->where('a.campaignId IN (:ids)')->setParameter('ids', $campaignIds)
            ->orderBy('a.createdAt', 'DESC');
        if ($status !== '' && in_array($status, Application::validStatuses(), true)) {
            $qb->andWhere('a.status = :st')->setParameter('st', $status);
        }
        if ($campaignId !== '' && in_array($campaignId, $campaignIds, true)) {
            $qb->andWhere('a.campaignId = :cid')->setParameter('cid', $campaignId);
        }

        // Filtre "mes dossiers" via les assignations
        if ($mine) {
            $myApps = array_map(
                fn(Assignment $x) => $x->getApplicationId(),
                $em->getRepository(Assignment::class)->findBy(['assignedToUserId' => $user->getId()])
            );
            if (!$myApps) return $this->json(['data' => [], 'total' => 0, 'page' => 1, 'pages' => 1, 'campaigns' => array_map(fn($id) => ['id' => $id, 'title' => $titles[$id]], $campaignIds)]);
            $qb->andWhere('a.id IN (:mine)')->setParameter('mine', $myApps);
        }

        $all   = $qb->getQuery()->getResult();
        $total = count($all);
        $pages = max(1, (int) ceil($total / $perPage));
        $slice = array_slice($all, ($page - 1) * $perPage, $perPage);

        // Assignations + noms (minimisés) en lot
        $data = [];
        foreach ($slice as $app) {
            $candidate = $em->getRepository(User::class)->find($app->getCandidateId());
            $assign    = $em->getRepository(Assignment::class)->findOneBy(['applicationId' => $app->getId()]);
            $assignee  = $assign ? $em->getRepository(User::class)->find($assign->getAssignedToUserId()) : null;
            $data[] = [
                'id'            => $app->getId(),
                'candidateName' => $candidate ? $candidate->getFirstName() . ' ' . mb_substr($candidate->getLastName(), 0, 1) . '.' : 'Candidat',
                'campaignId'    => $app->getCampaignId(),
                'campaignTitle' => $titles[$app->getCampaignId()] ?? '—',
                'status'        => $app->getStatus(),
                'assignedTo'    => $assignee ? $assignee->getFirstName() . ' ' . mb_substr($assignee->getLastName(), 0, 1) . '.' : null,
                'createdAt'     => $app->getCreatedAt()->format('c'),
            ];
        }

        return $this->json([
            'data'      => $data,
            'total'     => $total,
            'page'      => $page,
            'pages'     => $pages,
            'campaigns' => array_map(fn($id) => ['id' => $id, 'title' => $titles[$id]], $campaignIds),
        ]);
    }

    // ── GET /api/agency/dashboard — pilotage ORGANISATION (admin/manager) ──
    #[Route('/dashboard', methods: ['GET'])]
    public function dashboard(EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user  = $sec->getUser();
        $orgId = $user->getOrganizationId();
        if (!$orgId || !$this->perms->canManage($user, $orgId)) {
            return $this->json(['error' => ['code' => 'ORGANIZATION_PERMISSION_DENIED', 'message' => 'Réservé aux administrateurs et managers.']], 403);
        }

        $campaigns = $em->createQuery(
            'SELECT c FROM App\Entity\Campaign c WHERE c.organizationId = :oid OR c.ownerId = :uid'
        )->setParameter('oid', $orgId)->setParameter('uid', $user->getId())->getResult();
        $ids = array_map(fn($c) => $c->getId(), $campaigns);
        $activeCampaigns = count(array_filter($campaigns, fn($c) => $c->getStatus() === 'active'));

        $apps = $ids ? $em->createQuery('SELECT a FROM App\Entity\Application a WHERE a.campaignId IN (:ids)')
            ->setParameter('ids', $ids)->getResult() : [];
        $pipeline = [];
        foreach ($apps as $a) $pipeline[$a->getStatus()] = ($pipeline[$a->getStatus()] ?? 0) + 1;

        // Visites à venir + agenda du jour
        $now = new \DateTimeImmutable(); $eod = $now->setTime(23, 59, 59);
        $upcoming = 0; $today = [];
        foreach ($ids ? $em->createQuery('SELECT s FROM App\Entity\VisitSlot s WHERE s.campaignId IN (:ids) AND s.startsAt > :now')
            ->setParameter('ids', $ids)->setParameter('now', $now->modify('-12 hours'))->getResult() : [] as $slot) {
            foreach ($em->getRepository(\App\Entity\VisitBooking::class)->findBy(['slotId' => $slot->getId()]) as $b) {
                if (!in_array($b->getStatus(), ['booked', 'confirmed'], true)) continue;
                if ($slot->getStartsAt() > $now) $upcoming++;
                if ($slot->getStartsAt() >= $now->setTime(0, 0) && $slot->getStartsAt() <= $eod) {
                    $cand = $em->getRepository(User::class)->find($b->getCandidateId());
                    $camp = null;
                    foreach ($campaigns as $cc) if ($cc->getId() === $slot->getCampaignId()) { $camp = $cc; break; }
                    $today[] = [
                        'time'      => $slot->getStartsAt()->format('H:i'),
                        'title'     => $camp?->getTitle() ?? 'Visite',
                        'candidate' => $cand ? $cand->getFirstName() . ' ' . mb_substr($cand->getLastName(), 0, 1) . '.' : 'Candidat',
                        'status'    => $b->getStatus(),
                    ];
                }
            }
        }
        usort($today, fn($x, $y) => strcmp($x['time'], $y['time']));

        // Activité récente (AuditLog, noms minimisés)
        $logs = $em->getRepository(\App\Entity\AuditLog::class)->findBy(['organizationId' => $orgId], ['createdAt' => 'DESC'], 8);
        $labels = ['assigned' => 'a assigné un dossier', 'unassigned' => 'a retiré une assignation',
                   'internal_comment_added' => 'a commenté un dossier', 'member_invited' => 'a invité un membre',
                   'member_joined' => 'a rejoint l\'agence', 'member_updated' => 'a modifié un rôle',
                   'member_removed' => 'a retiré un membre', 'organization_updated' => 'a mis à jour l\'organisation',
                   'follow_link_created' => 'a partagé le suivi avec un propriétaire'];
        $activity = [];
        foreach ($logs as $l) {
            $actor = $l->getActorId() ? $em->getRepository(User::class)->find($l->getActorId()) : null;
            $activity[] = [
                'who'  => $actor ? $actor->getFirstName() . ' ' . mb_substr($actor->getLastName(), 0, 1) . '.' : 'Système',
                'what' => $labels[$l->getAction()] ?? $l->getAction(),
                'at'   => $l->getCreatedAt()->format('c'),
            ];
        }

        return $this->json([
            'kpis' => [
                'activeCampaigns'   => $activeCampaigns,
                'totalApplications' => count($apps),
                'upcomingVisits'    => $upcoming,
                'pendingDecisions'  => $pipeline['decision'] ?? 0,
            ],
            'pipeline'   => $pipeline,
            'todayVisits' => array_slice($today, 0, 8),
            'activity'   => $activity,
        ]);
    }

    // ── GET /api/agency/my-day — journée PERSONNELLE de l'agent (tout membre) ──
    #[Route('/my-day', methods: ['GET'])]
    public function myDay(EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user  = $sec->getUser();
        $orgId = $user->getOrganizationId();
        if (!$orgId || !$this->perms->canView($user, $orgId)) {
            return $this->json(['error' => ['code' => 'ORGANIZATION_PERMISSION_DENIED', 'message' => 'Réservé aux membres de l\'organisation.']], 403);
        }

        $assignments = $em->getRepository(Assignment::class)->findBy(['assignedToUserId' => $user->getId()], ['createdAt' => 'DESC'], 50);
        $now = new \DateTimeImmutable();
        $files = [];
        foreach ($assignments as $as) {
            $app = $em->getRepository(Application::class)->find($as->getApplicationId());
            if (!$app || in_array($app->getStatus(), ['refused', 'cancelled', 'withdrawn'], true)) continue;
            $campaign  = $em->getRepository(Campaign::class)->find($app->getCampaignId());
            $candidate = $em->getRepository(User::class)->find($app->getCandidateId());

            // Prochaine action calculée (opérationnel, spec dashboard agent)
            [$next, $urgent] = match ($app->getStatus()) {
                'new'              => ['Ouvrir le dossier', true],
                'prequalification' => ['Étudier le dossier', false],
                'documents'        => ['Vérifier les documents', true],
                'visite'           => ['Gérer la visite', false],
                'decision'         => ['Préparer la décision', true],
                'signature'        => ['Suivre le bail', false],
                default            => ['Consulter', false],
            };
            $files[] = [
                'applicationId' => $app->getId(),
                'candidateName' => $candidate ? $candidate->getFirstName() . ' ' . mb_substr($candidate->getLastName(), 0, 1) . '.' : 'Candidat',
                'campaignTitle' => $campaign?->getTitle() ?? '—',
                'status'        => $app->getStatus(),
                'nextAction'    => $next,
                'urgent'        => $urgent,
            ];
        }

        // Mes visites du jour (campagnes org)
        $campaignIds = array_map(fn($c) => $c->getId(), $em->createQuery(
            'SELECT c FROM App\Entity\Campaign c WHERE c.organizationId = :oid OR c.ownerId = :uid'
        )->setParameter('oid', $orgId)->setParameter('uid', $user->getId())->getResult());
        $today = [];
        if ($campaignIds) {
            foreach ($em->createQuery('SELECT s FROM App\Entity\VisitSlot s WHERE s.campaignId IN (:ids) AND s.startsAt >= :sod AND s.startsAt <= :eod')
                ->setParameter('ids', $campaignIds)
                ->setParameter('sod', $now->setTime(0, 0))->setParameter('eod', $now->setTime(23, 59, 59))
                ->getResult() as $slot) {
                foreach ($em->getRepository(\App\Entity\VisitBooking::class)->findBy(['slotId' => $slot->getId()]) as $b) {
                    if (!in_array($b->getStatus(), ['booked', 'confirmed'], true)) continue;
                    $cand = $em->getRepository(User::class)->find($b->getCandidateId());
                    $today[] = [
                        'time'          => $slot->getStartsAt()->format('H:i'),
                        'candidate'     => $cand ? $cand->getFirstName() . ' ' . mb_substr($cand->getLastName(), 0, 1) . '.' : 'Candidat',
                        'status'        => $b->getStatus(),
                        'applicationId' => $b->getApplicationId(),
                    ];
                }
            }
            usort($today, fn($x, $y) => strcmp($x['time'], $y['time']));
        }

        return $this->json([
            'kpis' => [
                'assignedFiles' => count($files),
                'todayVisits'   => count($today),
                'urgent'        => count(array_filter($files, fn($f) => $f['urgent'])),
            ],
            'files'       => array_slice($files, 0, 12),
            'todayVisits' => $today,
        ]);
    }
}
