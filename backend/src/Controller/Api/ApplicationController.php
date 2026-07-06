<?php
declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Application;
use App\Entity\Campaign;
use App\Entity\Message;
use App\Entity\PassportShare;
use App\Entity\RentalPassport;
use App\Entity\User;
use App\Service\ActivityService;
use App\Service\ScoringService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Routing\Attribute\Route;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;

/**
 * Gestion des candidatures avec scoring, pipeline et sécurité des rôles.
 *
 * Règles d'accès :
 *  - Candidat : peut créer, voir SES candidatures, envoyer des messages
 *  - Propriétaire : peut voir les candidatures à SES campagnes, changer le statut
 *  - Personne ne peut voir les candidatures des autres utilisateurs
 */
#[Route('/api')]
final class ApplicationController extends AbstractController
{
    /** @var array<string,string> Prénom + initiale des propriétaires (rempli par myApplications) */
    private array $ownerNameCache = [];

    public function __construct(
        private readonly ScoringService $scoring,
        private readonly ActivityService $activity,
        private readonly RateLimiterFactory $applyLimiter
    ) {}

    // ─────────────────────────────────────────────────────────────────
    // APPLY — POST /api/campaigns/{id}/apply
    // ─────────────────────────────────────────────────────────────────
    #[Route('/campaigns/{id}/apply', methods: ['POST'])]
    public function apply(string $id, Request $request, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user = $sec->getUser();

        if (!in_array('ROLE_CANDIDATE', $user->getRoles(), true)) {
            return $this->json(['error' => 'Seuls les candidats peuvent postuler.'], 403);
        }

        // Rate limiting : max 10 candidatures/heure par candidat
        $limiter = $this->applyLimiter->create($user->getId());
        if (!$limiter->consume(1)->isAccepted()) {
            return $this->json(['error' => 'Trop de candidatures. Attendez une heure.'], 429);
        }

        $campaign = $em->getRepository(Campaign::class)->find($id);
        if (!$campaign)             return $this->json(['error' => 'Campagne introuvable.'], 404);
        if (!$campaign->isPublished()) return $this->json(['error' => 'Cette campagne n\'est pas disponible.'], 422);

        // Un candidat ne peut pas postuler à sa propre campagne (si jamais double rôle)
        if ($campaign->getOwnerId() === $user->getId()) {
            return $this->json(['error' => 'Vous ne pouvez pas postuler à votre propre campagne.'], 422);
        }

        $decoded = json_decode($request->getContent(), true);
        $data    = is_array($decoded) ? $decoded : [];

        $app = new Application();
        $app->setCampaignId($id)
            ->setCandidateId($user->getId())
            ->setCoverLetter(
                (static function (string $raw): ?string {
                    $v = trim($raw);
                    if ($v === '') return null;
                    if (mb_strlen($v) > 2000) return mb_substr($v, 0, 2000);
                    return $v;
                })((string) ($data['coverLetter'] ?? ''))
            );

        $em->persist($app);
        // RGPD : le dépôt matérialise le CONSENTEMENT de partage du passport —
        // visible et révocable par le candidat (retrait de candidature)
        $em->persist(new PassportShare($user->getId(), $app->getId(), $campaign->getId(), $campaign->getOwnerId()));

        try {
            $em->flush();
        } catch (UniqueConstraintViolationException) {
            return $this->json(['error' => 'Vous avez déjà postulé à cette campagne.'], 409);
        }

        // Calculer le score si le candidat a un Rental Passport
        $passport = $em->getRepository(RentalPassport::class)->findOneBy(['userId' => $user->getId()]);
        if ($passport) {
            $this->scoring->score($app, $passport, $campaign);
        }

        // Audit + notification propriétaire (spec : chaque action crée un TimelineEvent)
        $this->activity->log(
            $app->getId(), 'application_created',
            'Candidature déposée par ' . $user->getFirstName() . ' ' . mb_substr($user->getLastName(), 0, 1) . '.',
            $user->getId(), 'candidate'
        );
        $this->activity->notify(
            $campaign->getOwnerId(), 'application_created',
            'Nouvelle candidature',
            $user->getFirstName() . ' a candidaté à « ' . $campaign->getTitle() . ' ».',
            '/candidatures?campaign=' . $campaign->getId()
        );
        $em->flush();

        return $this->json($this->serializeForCandidate($app, $campaign), 201);
    }

    // ─────────────────────────────────────────────────────────────────
    // CONTACT — POST /api/campaigns/{id}/contact
    //   Vérifie que le candidat peut ouvrir un fil de discussion.
    //   NE CRÉE JAMAIS DE CANDIDATURE (exigence Phase 2) — le fil vit dans
    //   ThreadController ; s'il existe déjà une candidature, on renvoie sa
    //   conversation à la place.
    // ─────────────────────────────────────────────────────────────────
    #[Route('/campaigns/{id}/contact', methods: ['POST'])]
    public function contact(string $id, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        $campaign = $em->getRepository(Campaign::class)->find($id)
                  ?? $em->getRepository(Campaign::class)->findOneBy(['slug' => $id]);
        if (!$campaign || !$campaign->isPublished()) {
            return $this->json(['error' => 'Annonce introuvable ou non publiée.'], 404);
        }

        /** @var User $user */
        $user = $sec->getUser();
        if (!in_array('ROLE_CANDIDATE', $user->getRoles(), true)) {
            return $this->json(['error' => 'Seuls les comptes candidats peuvent contacter un propriétaire.'], 403);
        }
        if ($campaign->isOwner($user->getId())) {
            return $this->json(['error' => 'Vous ne pouvez pas vous contacter vous-même.'], 422);
        }

        $existing = $em->getRepository(Application::class)->findOneBy([
            'campaignId' => $campaign->getId(), 'candidateId' => $user->getId(),
        ]);

        return $this->json([
            'mode'          => $existing ? 'application' : 'thread',
            'applicationId' => $existing?->getId(),
            'campaignId'    => $campaign->getId(),
            'campaignTitle' => $campaign->getTitle(),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────
    // REQUEST DOCUMENT — POST /api/applications/{id}/request-document
    //   Le propriétaire demande une pièce manquante (spec : « demander une
    //   pièce ») : notification + timeline + message auto dans la conversation.
    // ─────────────────────────────────────────────────────────────────
    #[Route('/applications/{id}/request-document', methods: ['POST'])]
    public function requestDocument(string $id, Request $request, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        $app = $em->getRepository(Application::class)->find($id);
        if (!$app) return $this->json(['error' => 'Candidature introuvable.'], 404);

        $campaign = $em->getRepository(Campaign::class)->find($app->getCampaignId());
        /** @var User $user */
        $user = $sec->getUser();
        if (!$campaign || !$campaign->isOwner($user->getId())) {
            return $this->json(['error' => 'Accès refusé.'], 403);
        }

        $decoded = json_decode($request->getContent(), true);
        $type    = (string) ((is_array($decoded) ? $decoded : [])['type'] ?? '');
        $labels  = [
            'identity' => 'Pièce d\'identité', 'domicile' => 'Justificatif de domicile',
            'contract' => 'Contrat de travail', 'payslips' => 'Fiches de paie',
            'tax' => 'Avis d\'imposition', 'rib' => 'RIB', 'insurance' => 'Attestation d\'assurance',
            'guarantor_id' => 'Pièce d\'identité du garant', 'guarantor_income' => 'Revenus du garant',
        ];
        if (!isset($labels[$type])) return $this->json(['error' => 'Type de document invalide.'], 422);
        $label = $labels[$type];

        // Message automatique dans la conversation (traçable, transparent)
        $msg = new Message();
        $msg->setApplicationId($app->getId())
            ->setCampaignId($app->getCampaignId())
            ->setCandidateId($app->getCandidateId())
            ->setSenderId($user->getId())
            ->setSenderRole('owner')
            ->setContent('Pour avancer sur votre dossier, merci d\'ajouter : ' . $label . ' (Rental Passport → Documents).');
        $em->persist($msg);

        $this->activity->log($app->getId(), 'document_requested',
            'Document demandé : ' . $label . '.', $user->getId(), 'owner');
        $this->activity->notify($app->getCandidateId(), 'document_requested',
            'Document demandé',
            'Le propriétaire demande : ' . $label . ' pour « ' . $campaign->getTitle() . ' ».',
            '/rental-passport');
        $em->flush();

        return $this->json(['requested' => $type, 'label' => $label], 201);
    }

    // ─────────────────────────────────────────────────────────────────
    // WITHDRAW — POST /api/applications/{id}/withdraw
    //   Le candidat retire sa candidature (droit de contrôle, spec) :
    //   statut withdrawn + révocation du partage passport + notification.
    //   L'historique est CONSERVÉ (jamais supprimé — archivage).
    // ─────────────────────────────────────────────────────────────────
    #[Route('/applications/{id}/withdraw', methods: ['POST'])]
    public function withdraw(string $id, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        $app = $em->getRepository(Application::class)->find($id);
        if (!$app) return $this->json(['error' => 'Candidature introuvable.'], 404);

        /** @var User $user */
        $user = $sec->getUser();
        if (!$app->belongsToCandidate($user->getId())) {
            return $this->json(['error' => 'Accès refusé.'], 403);
        }
        if (in_array($app->getStatus(), ['withdrawn', 'accepted', 'refused', 'cancelled'], true)) {
            return $this->json(['error' => 'Cette candidature est déjà clôturée.'], 422);
        }

        $old = $app->getStatus();
        $app->setStatus('withdrawn');

        // Révoquer le partage du passport
        $share = $em->getRepository(PassportShare::class)->findOneBy(['applicationId' => $app->getId()]);
        if ($share && $share->isActive()) $share->revoke();

        $campaign = $em->getRepository(Campaign::class)->find($app->getCampaignId());
        $this->activity->log($app->getId(), 'status_changed',
            'Candidature retirée par le candidat.', $user->getId(), 'candidate', $old, 'withdrawn');
        if ($campaign) {
            $this->activity->notify($campaign->getOwnerId(), 'status_changed',
                'Candidature retirée',
                $user->getFirstName() . ' a retiré sa candidature pour « ' . $campaign->getTitle() . ' ».',
                '/candidatures');
        }
        $em->flush();

        return $this->json(['id' => $app->getId(), 'status' => 'withdrawn']);
    }

    // ─────────────────────────────────────────────────────────────────
    // MY APPLICATIONS — GET /api/my-applications
    // ─────────────────────────────────────────────────────────────────
    #[Route('/my-applications', methods: ['GET'])]
    public function myApplications(Request $request, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user = $sec->getUser();

        $page   = max(1, (int) $request->query->get('page', 1));
        $limit  = max(1, min(50, (int) $request->query->get('limit', 20)));
        $total  = $em->getRepository(Application::class)->count(['candidateId' => $user->getId()]);
        $apps   = $em->getRepository(Application::class)->findBy(
            ['candidateId' => $user->getId()],
            ['createdAt' => 'DESC'],
            $limit,
            ($page - 1) * $limit
        );

        if (!$apps) return $this->json(['data' => [], 'meta' => ['page' => $page, 'limit' => $limit, 'total' => 0, 'totalPages' => 0, 'hasNext' => false, 'hasPrev' => false]]);

        // Pré-charger toutes les campagnes en une requête (évite N+1)
        $campaignIds = array_unique(array_map(fn($a) => $a->getCampaignId(), $apps));
        $campaigns   = $em->getRepository(Campaign::class)->findBy(['id' => $campaignIds]);
        $campaignMap = [];
        foreach ($campaigns as $c) { $campaignMap[$c->getId()] = $c; }

        // Noms propriétaires minimisés (Prénom + initiale) pour nommer les conversations
        $ownerIds = array_values(array_unique(array_map(fn($cc) => $cc->getOwnerId(), $campaigns)));
        if ($ownerIds) {
            foreach ($em->getRepository(User::class)->findBy(['id' => $ownerIds]) as $o) {
                $this->ownerNameCache[$o->getId()] = $o->getFirstName() . ' ' . mb_substr($o->getLastName(), 0, 1) . '.';
            }
        }

        $data = [];
        foreach ($apps as $app) {
            $campaign = $campaignMap[$app->getCampaignId()] ?? null;
            if (!$campaign) continue;
            $data[] = $this->serializeForCandidate($app, $campaign);
        }

        return $this->json([
            'data' => $data,
            'meta' => ['page' => $page, 'limit' => $limit, 'total' => $total,
                       'totalPages' => (int) ceil($total / $limit),
                       'hasNext' => $page < ceil($total / $limit), 'hasPrev' => $page > 1],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────
    // CAMPAIGN APPLICATIONS — GET /api/campaigns/{id}/applications
    //   Propriétaire uniquement — vue Kanban
    // ─────────────────────────────────────────────────────────────────
    #[Route('/campaigns/{id}/applications', methods: ['GET'])]
    public function campaignApplications(string $id, Request $request, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        $campaign = $em->getRepository(Campaign::class)->find($id);
        if (!$campaign) return $this->json(['error' => 'Campagne introuvable.'], 404);

        /** @var User $user */
        $user = $sec->getUser();
        if (!$campaign->isOwner($user->getId())) return $this->json(['error' => 'Accès refusé.'], 403);

        $page    = max(1, (int) $request->query->get('page', 1));
        $limit   = max(1, min(100, (int) $request->query->get('limit', 50)));
        $total   = $em->getRepository(Application::class)->count(['campaignId' => $id]);
        $apps    = $em->getRepository(Application::class)->findBy(
            ['campaignId' => $id],
            ['createdAt' => 'DESC'],
            $limit,
            ($page - 1) * $limit
        );

        if (!$apps) return $this->json(['data' => [], 'meta' => ['page' => $page, 'limit' => $limit, 'total' => $total, 'totalPages' => 0, 'hasNext' => false, 'hasPrev' => false]]);

        // Pré-charger candidats et passeports en 2 requêtes (évite 2N queries)
        $candidateIds = array_unique(array_map(fn($a) => $a->getCandidateId(), $apps));

        $candidates = $em->getRepository(User::class)->findBy(['id' => $candidateIds]);
        $candidateMap = [];
        foreach ($candidates as $c) { $candidateMap[$c->getId()] = $c; }

        $passports = $em->getRepository(RentalPassport::class)->findBy(['userId' => $candidateIds]);
        $passportMap = [];
        foreach ($passports as $p) { $passportMap[$p->getUserId()] = $p; }

        $data = [];
        foreach ($apps as $app) {
            $candidate = $candidateMap[$app->getCandidateId()] ?? null;
            $passport  = $passportMap[$app->getCandidateId()] ?? null;
            $data[] = $this->serializeForOwner($app, $candidate, $passport);
        }

        return $this->json([
            'data' => $data,
            'meta' => ['page' => $page, 'limit' => $limit, 'total' => $total,
                       'totalPages' => (int) ceil($total / max(1, $limit)),
                       'hasNext' => $page < ceil($total / max(1, $limit)),
                       'hasPrev' => $page > 1],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────
    // DETAIL — GET /api/applications/{id}
    // ─────────────────────────────────────────────────────────────────
    #[Route('/applications/{id}', methods: ['GET'])]
    public function detail(string $id, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        $app = $em->getRepository(Application::class)->find($id);
        if (!$app) return $this->json(['error' => 'Candidature introuvable.'], 404);

        /** @var User $user */
        $user     = $sec->getUser();
        $campaign = $em->getRepository(Campaign::class)->find($app->getCampaignId());

        // Vérification d'accès : candidat ou propriétaire de la campagne
        if (!$campaign) {
            // Campagne supprimée → le candidat peut encore voir sa propre candidature
            if (!$app->belongsToCandidate($user->getId())) {
                return $this->json(['error' => 'Candidature introuvable.'], 404);
            }
            return $this->json($this->serializeForCandidate($app, null));
        }

        $isOwner     = $campaign->isOwner($user->getId());
        $isCandidate = $app->belongsToCandidate($user->getId());

        if (!$isOwner && !$isCandidate) {
            return $this->json(['error' => 'Accès refusé.'], 403);
        }

        if ($isOwner) {
            // Transparence (spec) : « Le propriétaire consulte actuellement votre candidature »
            if ($app->getViewedAt() === null) {
                $app->markViewed();
                $this->activity->log(
                    $app->getId(), 'status_changed',
                    'Le propriétaire a consulté votre dossier.',
                    $user->getId(), 'owner'
                );
                $this->activity->notify(
                    $app->getCandidateId(), 'status_changed',
                    'Votre dossier est consulté',
                    'Le propriétaire consulte actuellement votre candidature pour « ' . $campaign->getTitle() . ' ».',
                    '/mes-candidatures'
                );
                $em->flush();
            }

            $candidate = $em->getRepository(User::class)->find($app->getCandidateId());
            $passport  = $em->getRepository(RentalPassport::class)->findOneBy(['userId' => $app->getCandidateId()]);
            $resp      = $this->serializeForOwner($app, $candidate, $passport);
            $resp['documentsRequired'] = $campaign->getDocumentsRequired();
            $resp['scoreBreakdown'] = $app->getScoreBreakdown(); // Détail score visible proprio
            return $this->json($resp);
        }

        $out = $this->serializeForCandidate($app, $campaign);
        $out['documentsRequired'] = $campaign->getDocumentsRequired();
        // Documents fournis (types + statuts seulement — c'est SON dossier)
        $pp = $em->getRepository(\App\Entity\RentalPassport::class)->findOneBy(['userId' => $user->getId()]);
        $out['myDocuments'] = array_map(fn(array $d) => [
            'type' => $d['type'] ?? '', 'status' => $d['status'] ?? 'uploaded',
            'reviewComment' => $d['reviewComment'] ?? null,
        ], $pp?->getDocuments() ?? []);
        return $this->json($out);
    }

    // ─────────────────────────────────────────────────────────────────
    // UPDATE STATUS — PATCH /api/applications/{id}/status
    //   Propriétaire uniquement
    // ─────────────────────────────────────────────────────────────────
    #[Route('/applications/{id}/status', methods: ['PATCH'])]
    public function updateStatus(string $id, Request $request, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        $app = $em->getRepository(Application::class)->find($id);
        if (!$app) return $this->json(['error' => 'Candidature introuvable.'], 404);

        /** @var User $user */
        $user     = $sec->getUser();
        $campaign = $em->getRepository(Campaign::class)->find($app->getCampaignId());

        if (!$campaign || !$campaign->isOwner($user->getId())) {
            return $this->json(['error' => 'Accès refusé.'], 403);
        }

        $decoded = json_decode($request->getContent(), true);
        $status  = trim((string) ($decoded['status'] ?? ''));

        if (!in_array($status, Application::validStatuses(), true)) {
            return $this->json([
                'error'   => 'Statut invalide.',
                'allowed' => Application::validStatuses(),
            ], 422);
        }

        $oldStatus = $app->getStatus();
        $app->setStatus($status);

        // Audit obligatoire (spec) : tout changement de statut est tracé
        $labels = ['new' => 'Nouveau', 'prequalification' => 'Préqualification', 'documents' => 'Documents',
                   'visite' => 'Visite', 'decision' => 'Décision', 'signature' => 'Signature',
                   'accepted' => 'Acceptée', 'waitlist' => 'Liste d\'attente',
                   'refused' => 'Refusée', 'cancelled' => 'Annulée'];
        $this->activity->log(
            $app->getId(), 'status_changed',
            'Statut passé de « ' . ($labels[$oldStatus] ?? $oldStatus) . ' » à « ' . ($labels[$status] ?? $status) . ' ».',
            $user->getId(), 'owner', $oldStatus, $status
        );
        $notifType = $status === 'accepted' ? 'application_accepted'
                   : ($status === 'refused' ? 'application_rejected' : 'status_changed');
        $notifTitle = match ($status) {
            'accepted'  => 'Candidature acceptée 🎉',
            'refused'   => 'Candidature non retenue',
            'waitlist'  => 'Vous êtes sur liste d\'attente',
            'cancelled' => 'Candidature annulée',
            default     => 'Votre candidature avance',
        };
        $this->activity->notify(
            $app->getCandidateId(), $notifType, $notifTitle,
            'Votre candidature pour « ' . $campaign->getTitle() . ' » est maintenant : ' . ($labels[$status] ?? $status) . '.',
            '/mes-candidatures'
        );
        $em->flush();

        return $this->json(['id' => $app->getId(), 'status' => $app->getStatus()]);
    }

    // ─────────────────────────────────────────────────────────────────
    // UPDATE NOTE — PATCH /api/applications/{id}/note
    // ─────────────────────────────────────────────────────────────────
    #[Route('/applications/{id}/note', methods: ['PATCH'])]
    public function updateNote(string $id, Request $request, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        $app = $em->getRepository(Application::class)->find($id);
        if (!$app) return $this->json(['error' => 'Candidature introuvable.'], 404);

        /** @var User $user */
        $user     = $sec->getUser();
        $campaign = $em->getRepository(Campaign::class)->find($app->getCampaignId());
        if (!$campaign || !$campaign->isOwner($user->getId())) return $this->json(['error' => 'Accès refusé.'], 403);

        $decoded = json_decode($request->getContent(), true);
        $note    = mb_substr(trim((string) ($decoded['note'] ?? '')), 0, 3000);
        $app->setOwnerNote($note ?: null);
        $app->touch();
        $em->flush();

        return $this->json(['id' => $app->getId(), 'ownerNote' => $app->getOwnerNote()]);
    }

    // ─────────────────────────────────────────────────────────────────
    // RECALCULATE SCORE — POST /api/applications/{id}/score
    // ─────────────────────────────────────────────────────────────────
    #[Route('/applications/{id}/score', methods: ['POST'])]
    public function recalcScore(string $id, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        $app = $em->getRepository(Application::class)->find($id);
        if (!$app) return $this->json(['error' => 'Candidature introuvable.'], 404);

        /** @var User $user */
        $user     = $sec->getUser();
        $campaign = $em->getRepository(Campaign::class)->find($app->getCampaignId());
        if (!$campaign || !$campaign->isOwner($user->getId())) return $this->json(['error' => 'Accès refusé.'], 403);

        $passport = $em->getRepository(RentalPassport::class)->findOneBy(['userId' => $app->getCandidateId()]);
        if (!$passport) return $this->json(['error' => 'Le candidat n\'a pas de Rental Passport.'], 422);

        $score = $this->scoring->score($app, $passport, $campaign);
        $em->flush();

        return $this->json([
            'score'          => $score,
            'label'          => ScoringService::scoreLabel($score),
            'breakdown'      => $app->getScoreBreakdown(),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────
    // Serializers
    // ─────────────────────────────────────────────────────────────────
    private function serializeForCandidate(Application $app, ?Campaign $campaign): array
    {
        return [
            'id'          => $app->getId(),
            'campaignId'  => $app->getCampaignId(),
            'status'      => $app->getStatus(),
            'viewedAt'    => $app->getViewedAt()?->format('c'),
            'coverLetter' => $app->getCoverLetter(),
            'createdAt'   => $app->getCreatedAt()->format('c'),
            'updatedAt'   => $app->getUpdatedAt()?->format('c'),
            // Score non exposé au candidat (algorithme propriétaire)
            // On expose seulement si >= 70 pour indication ("Compatible" / "Très compatible")
            'compatibilityHint' => $app->getScore() !== null && $app->getScore() >= 70
                ? ScoringService::scoreLabel($app->getScore()) : null,
            'campaign' => $campaign ? [
                'id'           => $campaign->getId(),
                'ownerName'    => $this->ownerNameCache[$campaign->getOwnerId()] ?? null,
                'title'        => $campaign->getTitle(),
                'address'      => $campaign->getAddress(),
                'rent'         => $campaign->getRent(),
                'charges'      => $campaign->getCharges(),
                'surface'      => $campaign->getSurface(),
                'rooms'        => $campaign->getRooms(),
                'propertyType' => $campaign->getPropertyType(),
                'photos'       => array_slice($campaign->getPhotos(), 0, 1),
                'availableAt'  => $campaign->getAvailableAt()?->format('Y-m-d'),
            ] : null,
        ];
    }

    private function serializeForOwner(Application $app, ?User $candidate, ?RentalPassport $passport): array
    {
        $data = [
            'id'            => $app->getId(),
            'campaignId'    => $app->getCampaignId(),
            'status'        => $app->getStatus(),
            'score'         => $app->getScore(),
            'scoreLabel'    => $app->getScore() !== null ? ScoringService::scoreLabel($app->getScore()) : null,
            'scoreColor'    => $app->getScore() !== null ? ScoringService::scoreColor($app->getScore()) : null,
            'ownerNote'     => $app->getOwnerNote(),
            'tags'          => $app->getTags(),
            'coverLetter'   => $app->getCoverLetter(),
            'createdAt'     => $app->getCreatedAt()->format('c'),
            'updatedAt'     => $app->getUpdatedAt()?->format('c'),
            'statusChangedAt' => $app->getStatusChangedAt()?->format('c'),
        ];

        // Données candidate — minimum nécessaire (RGPD : données proportionnées)
        if ($candidate) {
            $data['candidate'] = [
                'id'        => $candidate->getId(),
                'firstName' => $candidate->getFirstName(),
                'lastName'  => $candidate->getLastName(),
                'email'     => $candidate->getEmail(),
            ];
        }

        // Données Rental Passport — seulement les données pertinentes pour la décision
        if ($passport) {
            $data['passport'] = [
                'completionRate'  => $passport->getCompletionRate(),
                'contractType'    => $passport->getContractType(),
                'employer'        => $passport->getEmployer(),
                'monthlyIncome'   => $passport->getMonthlyIncome(),
                'guarantorRelation' => $passport->getGuarantorRelation(),
                'guarantorIncome' => $passport->getGuarantorIncome(),
                'availabilityDate'=> $passport->getAvailabilityDate(),
                'documentsCount'  => count($passport->getDocuments()),
                // Liste complète pour la validation par le propriétaire (spec : voir/valider/refuser)
                'documents'       => array_map(fn(array $d) => [
                    'type'          => $d['type'] ?? '',
                    'name'          => $d['name'] ?? '',
                    'url'           => $d['url'] ?? '',
                    'uploadedAt'    => $d['uploadedAt'] ?? null,
                    'status'        => $d['status'] ?? 'uploaded',
                    'reviewComment' => $d['reviewComment'] ?? null,
                ], $passport->getDocuments()),
                'preferredCity'   => $passport->getPreferredCity(),
            ];
        }

        return $data;
    }
}
