<?php
declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Application;
use App\Entity\Campaign;
use App\Service\ActivityService;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/campaigns')]
final class CampaignController extends AbstractController
{
    public function __construct(private readonly ActivityService $activity, private readonly \App\Service\OrganizationPermissionService $perms) {}

    // ── Validation constantes ──────────────────────────────────────────
    private const VALID_PROPERTY_TYPES = ['apartment','house','colocation','studio','bureau','commerce'];
    private const VALID_RENTAL_TYPES   = ['empty','furnished','colocation'];
    private const VALID_STATUSES       = ['draft','active','paused','closed'];
    private const VALID_AMENITIES      = ['elevator','parking','balcony','fiber','dishwasher','washer','cellar','bike','heating','furnished_kitchen','pool','garden','terrace','digicode','intercom'];
    private const VALID_DOC_TYPES      = ['identity','domicile','contract','payslips','tax','rib','insurance','guarantor_id','guarantor_income'];

    // ─────────────────────────────────────────────────────────────────
    // LIST — GET /api/campaigns
    //   Owner → ses campagnes
    //   Candidate → campagnes publiées (avec filtres optionnels)
    // ─────────────────────────────────────────────────────────────────
    #[Route('', methods: ['GET'])]
    public function list(Request $request, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user  = $sec->getUser();
        $roles = $user->getRoles();

        $isOwner = in_array('ROLE_OWNER', $roles, true) || in_array('ROLE_AGENCY', $roles, true);

        $qb = $em->getRepository(Campaign::class)->createQueryBuilder('c');

        if ($isOwner) {
            // Propriétaire : ses campagnes + celles de son organisation (agence)
            if ($user->getOrganizationId() && $this->perms->canView($user, $user->getOrganizationId())) {
                $qb->where('c.ownerId = :uid OR c.organizationId = :oid')
                   ->setParameter('uid', $user->getId())
                   ->setParameter('oid', $user->getOrganizationId());
            } else {
                $qb->where('c.ownerId = :uid')->setParameter('uid', $user->getId());
            }
        } else {
            // Candidat : uniquement les campagnes actives/publiées
            $qb->where('c.status = :status')->setParameter('status', 'active');

            // Filtres optionnels pour la recherche côté candidat
            if ($q = $request->query->get('q')) {
                $qb->andWhere('c.title LIKE :q OR c.address LIKE :q')
                   ->setParameter('q', '%' . $q . '%');
            }
            if ($maxRent = $request->query->get('maxRent')) {
                $qb->andWhere('c.rent + c.charges <= :maxRent')
                   ->setParameter('maxRent', (float) $maxRent);
            }
            if ($type = $request->query->get('type')) {
                if (in_array($type, self::VALID_PROPERTY_TYPES, true)) {
                    $qb->andWhere('c.propertyType = :type')->setParameter('type', $type);
                }
            }
        }

        $qb->orderBy('c.createdAt', 'DESC');

        // Pagination
        $page     = max(1, (int) $request->query->get('page', 1));
        $limit    = max(1, min(50, (int) $request->query->get('limit', 20)));
        $offset   = ($page - 1) * $limit;
        // PostgreSQL refuse ORDER BY sur un COUNT (contrairement à MySQL) :
        // on retire le tri hérité du clone avant de compter.
        $total    = (int) (clone $qb)->select('COUNT(c.id)')->resetDQLPart('orderBy')->getQuery()->getSingleScalarResult();
        $campaigns = $qb->setFirstResult($offset)->setMaxResults($limit)->getQuery()->getResult();

        $data = [];
        if (!$campaigns) return $this->json(['data' => [], 'meta' => ['page' => $page, 'limit' => $limit, 'total' => 0, 'totalPages' => 0, 'hasNext' => false, 'hasPrev' => false]]);

        $campaignIds = array_map(fn($c) => $c->getId(), $campaigns);
        if (empty($campaignIds)) return $this->json(['data' => [], 'meta' => ['page' => $page, 'limit' => $limit, 'total' => 0, 'totalPages' => 0, 'hasNext' => false, 'hasPrev' => false]]);

        // ── Pré-charger les compteurs d'un coup (évite N+1) ──────────
        if ($isOwner) {
            $counts = $em->createQuery(
                'SELECT a.campaignId, COUNT(a.id) as cnt FROM App\Entity\Application a
                 WHERE a.campaignId IN (:ids) GROUP BY a.campaignId'
            )->setParameter('ids', $campaignIds)->getResult();
            $countMap = [];
            foreach ($counts as $row) { $countMap[$row['campaignId']] = (int) $row['cnt']; }
        } else {
            // Candidature existante du user sur ses campagnes visibles
            $myApps = $em->createQuery(
                'SELECT a.campaignId, a.id as appId, a.status FROM App\Entity\Application a
                 WHERE a.campaignId IN (:ids) AND a.candidateId = :uid'
            )->setParameter('ids', $campaignIds)->setParameter('uid', $user->getId())->getResult();
            $myAppMap = [];
            foreach ($myApps as $row) { $myAppMap[$row['campaignId']] = $row; }
        }

        foreach ($campaigns as $c) {
            $row = $this->serializeList($c);

            if ($isOwner) {
                $row['applicationCount'] = $countMap[$c->getId()] ?? 0;
            } else {
                // RGPD : jamais l'adresse exacte dans la recherche si le propriétaire la masque
                $row['address'] = $c->getPublicAddress();
                $existing = $myAppMap[$c->getId()] ?? null;
                $row['myApplicationId']     = $existing['appId'] ?? null;
                $row['myApplicationStatus'] = $existing['status'] ?? null;
            }

            $data[] = $row;
        }

        return $this->json([
            'data'  => $data,
            'meta'  => [
                'page'       => $page,
                'limit'      => $limit,
                'total'      => $total,
                'totalPages' => (int) ceil($total / $limit),
                'hasNext'    => $page < ceil($total / $limit),
                'hasPrev'    => $page > 1,
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────
    // CREATE — POST /api/campaigns
    //   Réservé aux propriétaires et agences
    // ─────────────────────────────────────────────────────────────────
    #[Route('', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user = $sec->getUser();

        if (!$this->isOwner($user)) {
            return $this->json(['error' => 'Seuls les propriétaires peuvent créer des campagnes.'], 403);
        }

        $decoded = json_decode($request->getContent(), true);
        $data    = is_array($decoded) ? $decoded : [];

        // ── Validation obligatoire ────────────────────────────────────
        $title   = trim((string) ($data['title'] ?? ''));
        $address = trim((string) ($data['address'] ?? ''));
        $rent    = isset($data['rent']) ? (float) $data['rent'] : null;

        if (!$title)           return $this->json(['error' => 'Le titre est requis.'], 422);
        if (mb_strlen($title) > 255) return $this->json(['error' => 'Titre trop long (max 255).'], 422);
        if (!$address)         return $this->json(['error' => 'L\'adresse est requise.'], 422);
        if ($rent === null || $rent < 0) return $this->json(['error' => 'Le loyer doit être supérieur ou égal à 0.'], 422);
        if ($rent > 100000)    return $this->json(['error' => 'Loyer invalide.'], 422);

        $propType = (string) ($data['propertyType'] ?? 'apartment');
        if (!in_array($propType, self::VALID_PROPERTY_TYPES, true)) {
            return $this->json(['error' => 'Type de bien invalide.'], 422);
        }

        $campaign = new Campaign();
        $campaign->setOwnerId($user->getId())
                 ->setOrganizationId(method_exists($user, 'getOrganizationId') ? $user->getOrganizationId() : null)
                 ->setTitle($title)
                 ->setSubtitle(trim((string) ($data['subtitle'] ?? '')) ?: null)
                 ->setPropertyType($propType)
                 ->setAddress($address)
                 ->setRent($rent)
                 ->setCharges(max(0, min(5000, (float) ($data['charges'] ?? 0))))
                 ->setDeposit(max(0, min(50000, (float) ($data['deposit'] ?? 0))))
                 ->setRentalType(in_array($data['rentalType'] ?? '', self::VALID_RENTAL_TYPES, true)
                     ? $data['rentalType'] : 'empty')
                 ->setSurface(isset($data['surface']) ? max(1, min(10000, (float) $data['surface'])) : null)
                 ->setRooms(isset($data['rooms']) ? max(1, min(50, (int) $data['rooms'])) : null)
                 ->setBedrooms(isset($data['bedrooms']) ? (int) $data['bedrooms'] : null)
                 ->setMinDuration(max(1, min(36, (int) ($data['minDuration'] ?? 12))))
                 ->setDescription(
                     isset($data['description']) && mb_strlen((string) $data['description']) <= 10000
                         ? (trim((string) $data['description']) ?: null)
                         : null
                 )
                 ->setAmenities($this->sanitizeStringArray($data['amenities'] ?? [], self::VALID_AMENITIES))
                 ->setDocumentsRequired($this->sanitizeStringArray($data['documentsRequired'] ?? [], self::VALID_DOC_TYPES))
                 ->setPreciseAddressVisible((bool) ($data['preciseAddressVisible'] ?? true))
                 ->setDpe($data['dpe'] ?? null)
                 ->setGes($data['ges'] ?? null)
                 ->setFloor(isset($data['floor']) && $data['floor'] !== '' ? (int) $data['floor'] : null)
                 ->setHasElevator((bool) ($data['hasElevator'] ?? false))
                 ->setHeatingType($data['heatingType'] ?? null)
                 ->setExtras(is_array($data['extras'] ?? null) ? $data['extras'] : []);

        if ($date = ($data['availableAt'] ?? null)) {
            try { $campaign->setAvailableAt(new \DateTimeImmutable($date)); } catch (\Throwable) {}
        }

        $em->persist($campaign);
        $em->flush();

        return $this->json($this->serializeDetail($campaign, $em, true), 201);
    }

    // ─────────────────────────────────────────────────────────────────
    // DETAIL — GET /api/campaigns/{id}
    // ─────────────────────────────────────────────────────────────────
    #[Route('/{id}', methods: ['GET'])]
    public function detail(string $id, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        $campaign = $em->getRepository(Campaign::class)->find($id);
        if (!$campaign) return $this->json(['error' => 'Campagne introuvable.'], 404);

        /** @var User $user */
        $user = $sec->getUser();

        // Candidat : ne peut voir que les campagnes publiées ou celles où il a déjà postulé
        if (!$this->isOwner($user)) {
            $hasApplication = (bool) $em->getRepository(Application::class)->findOneBy([
                'campaignId'  => $campaign->getId(),
                'candidateId' => $user->getId(),
            ]);
            if (!$campaign->isPublished() && !$hasApplication) {
                return $this->json(['error' => 'Campagne non disponible.'], 404);
            }
        } elseif (!$this->canAccess($campaign, $user, 'agent')) {
            // Propriétaire : ne peut voir que ses propres campagnes
            return $this->json(['error' => 'Accès refusé.'], 403);
        }

        $isOwnerView = $this->isOwner($user) && $campaign->isOwner($user->getId());
        return $this->json($this->serializeDetail($campaign, $em, $isOwnerView));
    }

    // ─────────────────────────────────────────────────────────────────
    // UPDATE — PUT /api/campaigns/{id}
    // ─────────────────────────────────────────────────────────────────
    #[Route('/{id}', methods: ['PUT', 'PATCH'])]
    public function update(string $id, Request $request, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        $campaign = $em->getRepository(Campaign::class)->find($id);
        if (!$campaign) return $this->json(['error' => 'Campagne introuvable.'], 404);

        /** @var User $user */
        $user = $sec->getUser();
        if (!$this->canAccess($campaign, $user, 'agent')) return $this->json(['error' => 'Accès refusé.'], 403);

        $decoded = json_decode($request->getContent(), true);
        $data    = is_array($decoded) ? $decoded : [];

        // Appliquer les modifications partielles
        if (isset($data['title'])) {
            $t = trim((string) $data['title']);
            if (!$t) return $this->json(['error' => 'Le titre est requis.'], 422);
            $campaign->setTitle($t);
        }
        if (array_key_exists('subtitle', $data))     $campaign->setSubtitle(trim((string) $data['subtitle']) ?: null);
        if (isset($data['address'])) { $a = trim((string) $data['address']); if (!$a) return $this->json(['error' => 'L\'adresse est requise.'], 422); if (mb_strlen($a) > 500) return $this->json(['error' => 'Adresse trop longue.'], 422); $campaign->setAddress($a); }
        if (isset($data['rent'])) {
            $r = (float) $data['rent'];
            if ($r <= 0 || $r > 100000) return $this->json(['error' => 'Loyer invalide.'], 422);
            $campaign->setRent($r);
        }
        if (isset($data['charges']))   { $c = (float) $data['charges']; if ($c < 0 || $c > 5000) return $this->json(['error' => 'Charges invalides.'], 422); $campaign->setCharges($c); }
        if (isset($data['deposit']))   { $d = (float) $data['deposit']; if ($d < 0 || $d > 50000) return $this->json(['error' => 'Dépôt invalide.'], 422); $campaign->setDeposit($d); }
        if (isset($data['surface']))   { $s = (float) $data['surface']; if ($s < 0 || $s > 10000) return $this->json(['error' => 'Surface invalide.'], 422); $campaign->setSurface($s); }
        if (isset($data['rooms']))     { $r = (int) $data['rooms']; if ($r < 1 || $r > 50) return $this->json(['error' => 'Nombre de pièces invalide.'], 422); $campaign->setRooms($r); }
        if (isset($data['bedrooms']))  $campaign->setBedrooms(max(0, min(20, (int) $data['bedrooms'])));
        if (isset($data['description'])) {
            $desc = trim((string) $data['description']);
            if (mb_strlen($desc) > 10000) return $this->json(['error' => 'Description trop longue (max 10000 caractères).'], 422);
            $campaign->setDescription($desc ?: null);
        }
        if (is_array($data['amenities'] ?? null))          $campaign->setAmenities($this->sanitizeStringArray($data['amenities'], self::VALID_AMENITIES));
        if (is_array($data['documentsRequired'] ?? null))  $campaign->setDocumentsRequired($this->sanitizeStringArray($data['documentsRequired'], self::VALID_DOC_TYPES));
        if (isset($data['availableAt'])) {
            try { $campaign->setAvailableAt(new \DateTimeImmutable($data['availableAt'])); } catch (\Throwable) {}
        }
        if (isset($data['preciseAddressVisible'])) $campaign->setPreciseAddressVisible((bool) $data['preciseAddressVisible']);
        if (array_key_exists('dpe', $data))         $campaign->setDpe($data['dpe']);
        if (array_key_exists('ges', $data))         $campaign->setGes($data['ges']);
        if (array_key_exists('floor', $data))       $campaign->setFloor($data['floor'] !== '' && $data['floor'] !== null ? (int) $data['floor'] : null);
        if (array_key_exists('hasElevator', $data)) $campaign->setHasElevator((bool) $data['hasElevator']);
        if (array_key_exists('heatingType', $data)) $campaign->setHeatingType($data['heatingType']);
        if (isset($data['extras']) && is_array($data['extras'])) $campaign->setExtras($data['extras']);

        $campaign->touch();

        // Exigence : les candidats d'une annonce PUBLIÉE modifiée sont notifiés
        if ($campaign->isPublished()) {
            $activeApps = $em->createQuery(
                'SELECT a FROM App\Entity\Application a
                 WHERE a.campaignId = :cid AND a.status NOT IN (:closed)'
            )->setParameter('cid', $campaign->getId())
             ->setParameter('closed', ['refused', 'accepted'])
             ->getResult();
            foreach ($activeApps as $activeApp) {
                $this->activity->notify(
                    $activeApp->getCandidateId(), 'status_changed',
                    'Annonce mise à jour',
                    'L\'annonce « ' . $campaign->getTitle() . ' » à laquelle vous avez candidaté a été modifiée par le propriétaire.',
                    '/annonces/' . ($campaign->getSlug() ?: $campaign->getId())
                );
            }
        }
        $em->flush();

        return $this->json($this->serializeDetail($campaign, $em, true)); // owner: toujours true ici
    }

    // ─────────────────────────────────────────────────────────────────
    // PUBLISH — POST /api/campaigns/{id}/publish
    // ─────────────────────────────────────────────────────────────────
    #[Route('/{id}/publish', methods: ['POST'])]
    public function publish(string $id, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        $campaign = $em->getRepository(Campaign::class)->find($id);
        if (!$campaign) return $this->json(['error' => 'Campagne introuvable.'], 404);

        /** @var User $user */
        $user = $sec->getUser();
        if (!$this->canAccess($campaign, $user, 'agent')) return $this->json(['error' => 'Accès refusé.'], 403);

        // Validation minimale avant publication
        if (!$campaign->getTitle() || $campaign->getRent() <= 0 || !$campaign->getAddress()) {
            return $this->json(['error' => 'Veuillez compléter titre, adresse et loyer avant de publier.'], 422);
        }

        $campaign->setStatus('active');
        if (!$campaign->getSlug()) $campaign->generateSlug();
        $campaign->setPublishedAt(new \DateTimeImmutable());
        $campaign->touch();
        $em->flush();

        return $this->json($this->serializeDetail($campaign, $em, true)); // owner: toujours true ici
    }

    // ─────────────────────────────────────────────────────────────────
    // PAUSE — POST /api/campaigns/{id}/pause
    // ─────────────────────────────────────────────────────────────────
    #[Route('/{id}/pause', methods: ['POST'])]
    public function pause(string $id, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        $campaign = $em->getRepository(Campaign::class)->find($id);
        if (!$campaign) return $this->json(['error' => 'Campagne introuvable.'], 404);
        /** @var User $user */
        $user = $sec->getUser();
        if (!$this->canAccess($campaign, $user, 'agent')) return $this->json(['error' => 'Accès refusé.'], 403);

        $campaign->setStatus('paused');
        $campaign->touch();
        $em->flush();
        return $this->json($this->serializeDetail($campaign, $em, true));
    }

    // ─────────────────────────────────────────────────────────────────
    // CLOSE — POST /api/campaigns/{id}/close
    //   Clôture de campagne (spec) : les candidatures encore ouvertes sont
    //   annulées avec un message NEUTRE + notification, l'historique est
    //   intégralement conservé (archivage, jamais de suppression).
    // ─────────────────────────────────────────────────────────────────
    #[Route('/{id}/close', methods: ['POST'])]
    public function close(string $id, EntityManagerInterface $em, Security $security): JsonResponse
    {
        $campaign = $em->getRepository(Campaign::class)->find($id);
        if (!$campaign) return $this->json(['error' => 'Campagne introuvable.'], 404);

        /** @var User $user */
        $user = $security->getUser();
        if (!$this->canAccess($campaign, $user, 'manager')) {
            return $this->json(['error' => 'Accès refusé.'], 403);
        }

        $open = $em->createQuery(
            'SELECT a FROM App\Entity\Application a
             WHERE a.campaignId = :cid AND a.status NOT IN (:closed)'
        )->setParameter('cid', $campaign->getId())
         ->setParameter('closed', ['accepted', 'refused', 'cancelled', 'withdrawn'])
         ->getResult();

        foreach ($open as $app) {
            $old = $app->getStatus();
            $app->setStatus('cancelled');
            $this->activity->log($app->getId(), 'status_changed',
                'La campagne a été clôturée par le propriétaire.',
                $user->getId(), 'owner', $old, 'cancelled', 'candidate_visible');
            // Message neutre (spec : jamais de motif, jamais de comparaison)
            $msg = new \App\Entity\Message();
            $msg->setApplicationId($app->getId())
                ->setCampaignId($campaign->getId())
                ->setCandidateId($app->getCandidateId())
                ->setSenderId($user->getId())
                ->setSenderRole('owner')
                ->setContent('La location « ' . $campaign->getTitle() . ' » est désormais pourvue. Merci pour votre candidature et le temps consacré à votre dossier.');
            $em->persist($msg);
            $this->activity->notify($app->getCandidateId(), 'status_changed',
                'Annonce pourvue',
                '« ' . $campaign->getTitle() . ' » a trouvé son locataire. Merci pour votre candidature.',
                '/mes-candidatures/' . $app->getId());
        }

        $campaign->setStatus('closed');
        $em->flush();

        return $this->json(['status' => 'closed', 'cancelledApplications' => count($open)]);
    }

    // ─────────────────────────────────────────────────────────────────
    // DELETE — DELETE /api/campaigns/{id}
    //   Uniquement si brouillon ET aucune candidature active
    // ─────────────────────────────────────────────────────────────────
    #[Route('/{id}', methods: ['DELETE'])]
    public function delete(string $id, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        $campaign = $em->getRepository(Campaign::class)->find($id);
        if (!$campaign) return $this->json(['error' => 'Campagne introuvable.'], 404);

        /** @var User $user */
        $user = $sec->getUser();
        if (!$this->canAccess($campaign, $user, 'agent')) return $this->json(['error' => 'Accès refusé.'], 403);

        $appCount = $em->getRepository(Application::class)->count(['campaignId' => $id]);
        if ($appCount > 0) {
            return $this->json(['error' => 'Impossible de supprimer : des candidatures existent.'], 409);
        }

        $em->remove($campaign);
        $em->flush();

        return $this->json(['deleted' => true]);
    }

    // ─────────────────────────────────────────────────────────────────
    // STATS — GET /api/campaigns/{id}/stats (owner only)
    // ─────────────────────────────────────────────────────────────────
    #[Route('/{id}/stats', methods: ['GET'])]
    public function stats(string $id, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        $campaign = $em->getRepository(Campaign::class)->find($id);
        if (!$campaign) return $this->json(['error' => 'Campagne introuvable.'], 404);
        /** @var User $user */
        $user = $sec->getUser();
        if (!$this->canAccess($campaign, $user, 'agent')) return $this->json(['error' => 'Accès refusé.'], 403);

        $apps = $em->getRepository(Application::class)->findBy(['campaignId' => $id]);

        $byStatus = [];
        $scores   = [];
        foreach ($apps as $a) {
            $byStatus[$a->getStatus()] = ($byStatus[$a->getStatus()] ?? 0) + 1;
            if ($a->getScore() !== null) $scores[] = $a->getScore();
        }

        return $this->json([
            'totalApplications'  => count($apps),
            'byStatus'           => $byStatus,
            'averageScore'       => count($scores) ? (int) round(array_sum($scores) / count($scores)) : null,
            'highCompatibility'  => count(array_filter($scores, fn($s) => $s >= 85)),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────
    // Serializers
    // ─────────────────────────────────────────────────────────────────
    /**
     * Accès de gestion à une campagne : propriétaire direct OU membre de
     * l'organisation avec le rôle minimum requis (permissions SERVEUR).
     */
    private function canAccess(Campaign $campaign, User $user, string $minRole = 'agent'): bool
    {
        if ($campaign->isOwner($user->getId())) return true;
        $orgId = $campaign->getOrganizationId();
        return $orgId !== null && $this->perms->hasAtLeast($user, $orgId, $minRole);
    }

    private function serializeList(Campaign $c): array
    {
        return [
            'id'           => $c->getId(),
            'title'        => $c->getTitle(),
            'subtitle'     => $c->getSubtitle(),
            'address'      => $c->getAddress(),
            'propertyType' => $c->getPropertyType(),
            'rent'         => $c->getRent(),
            'charges'      => $c->getCharges(),
            'surface'      => $c->getSurface(),
            'rooms'        => $c->getRooms(),
            'status'       => $c->getStatus(),
            'slug'         => $c->getSlug(),
            'photos'       => array_slice($c->getPhotos(), 0, 1), // vignette seulement
            'availableAt'  => $c->getAvailableAt()?->format('Y-m-d'),
            'createdAt'    => $c->getCreatedAt()->format('c'),
            'publishedAt'  => $c->getPublishedAt()?->format('c'),
        ];
    }

    private function serializeDetail(Campaign $c, EntityManagerInterface $em, bool $forOwner = false): array
    {
        $data = [
            'id'                 => $c->getId(),
            'title'              => $c->getTitle(),
            'subtitle'           => $c->getSubtitle(),
            'address'            => $c->getAddress(),
            'propertyType'       => $c->getPropertyType(),
            'rentalType'         => $c->getRentalType(),
            'rent'               => $c->getRent(),
            'charges'            => $c->getCharges(),
            'deposit'            => $forOwner ? $c->getDeposit() : null,
            'surface'            => $c->getSurface(),
            'rooms'              => $c->getRooms(),
            'bedrooms'           => $c->getBedrooms(),
            'bathrooms'          => $c->getBathrooms(),
            'floor'              => $c->getFloor(),
            'minDuration'        => $c->getMinDuration(),
            'description'        => $c->getDescription(),
            'amenities'          => $c->getAmenities(),
            'photos'             => $c->getPhotos(),
            'documentsRequired'  => $c->getDocumentsRequired(),
            'availableAt'        => $c->getAvailableAt()?->format('Y-m-d'),
            'status'             => $c->getStatus(),
            'slug'               => $c->getSlug(),
            'preciseAddressVisible' => $c->isPreciseAddressVisible(),
            'dpe'                => $c->getDpe(),
            'ges'                => $c->getGes(),
            'floor'              => $c->getFloor(),
            'hasElevator'        => $c->hasElevator(),
            'heatingType'        => $c->getHeatingType(),
            'extras'             => $c->getExtras(),
            'createdAt'          => $c->getCreatedAt()->format('c'),
            'publishedAt'        => $c->getPublishedAt()?->format('c'),
            'updatedAt'          => $c->getUpdatedAt()?->format('c'),
        ];

        if ($forOwner) {
            $data['applicationCount'] = $em->getRepository(Application::class)->count(['campaignId' => $c->getId()]);
        }

        return $data;
    }

    // ─────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────
    /**
     * Filtre un array JSON pour ne garder que les valeurs whitelistées.
     * Protège contre l'injection de valeurs arbitraires.
     */
    /**
     * Valide les URLs de photos (chemins relatifs uniquement, pas de path traversal).
     */
    private function sanitizePhotoUrls(mixed $arr): array
    {
        if (!is_array($arr)) return [];
        return array_values(array_filter(
            array_map('strval', $arr),
            function (string $url): bool {
                // Rejeter les URLs absolues, les path traversal, et les chemins suspects
                if (str_starts_with($url, 'http://') || str_starts_with($url, 'https://')) return false;
                if (str_contains($url, '..')) return false;
                if (str_contains($url, '\\')) return false;
                if (strlen($url) > 500) return false;
                return true;
            }
        ));
    }

    private function sanitizeStringArray(mixed $arr, array $whitelist): array
    {
        if (!is_array($arr)) return [];
        return array_values(array_filter(
            array_map('strval', $arr),
            fn($v) => in_array($v, $whitelist, true)
        ));
    }

    private function isOwner(User $user): bool
    {
        $roles = $user->getRoles();
        return in_array('ROLE_OWNER', $roles, true) || in_array('ROLE_AGENCY', $roles, true);
    }
}
