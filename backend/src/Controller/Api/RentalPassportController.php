<?php
declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Application;
use App\Entity\Campaign;
use App\Entity\RentalPassport;
use App\Entity\User;
use App\Service\ScoringService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Gestion du Rental Passport (dossier locataire).
 *
 * RGPD :
 *  - Données personnelles — accès strictement contrôlé
 *  - Candidat : CRUD complet sur SON passport
 *  - Propriétaire : lecture uniquement SI candidature active
 *  - Droit à l'oubli : DELETE supprime le passport
 *  - Audit : tout accès par un propriétaire pourrait être loggé (TODO prod)
 */
#[Route('/api/rental-passport')]
final class RentalPassportController extends AbstractController
{
    public function __construct(private readonly ScoringService $scoring) {}

    // ─────────────────────────────────────────────────────────────────
    // GET MY PASSPORT — GET /api/rental-passport
    // ─────────────────────────────────────────────────────────────────
    #[Route('', methods: ['GET'])]
    public function get(EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user     = $sec->getUser();
        $passport = $em->getRepository(RentalPassport::class)->findOneBy(['userId' => $user->getId()]);

        if (!$passport) {
            return $this->json(['exists' => false]);
        }

        return $this->json($this->serializeFull($passport));
    }

    // ─────────────────────────────────────────────────────────────────
    // UPSERT — PUT /api/rental-passport
    //   Crée ou met à jour le passport du candidat connecté
    // ─────────────────────────────────────────────────────────────────
    #[Route('', methods: ['PUT', 'POST'])]
    public function upsert(Request $request, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user = $sec->getUser();

        if (!in_array('ROLE_CANDIDATE', $user->getRoles(), true)) {
            return $this->json(['error' => 'Seuls les candidats peuvent gérer un Rental Passport.'], 403);
        }

        $passport = $em->getRepository(RentalPassport::class)->findOneBy(['userId' => $user->getId()]);
        $isNew    = false;

        if (!$passport) {
            $passport = new RentalPassport();
            $passport->setUserId($user->getId());
            // Pré-remplir depuis le compte si disponible
            // Pré-remplir depuis le compte si la méthode existe
            if (method_exists($user, 'getFirstName') && $user->getFirstName()) {
                $passport->setFirstName($user->getFirstName());
            }
            if (method_exists($user, 'getLastName') && $user->getLastName()) {
                $passport->setLastName($user->getLastName());
            }
            $em->persist($passport);
            $isNew = true;
        }

        $decoded = json_decode($request->getContent(), true);
        $data    = is_array($decoded) ? $decoded : [];

        // ── Identité ──────────────────────────────────────────────────
        if (isset($data['firstName'])) { $v = mb_substr(trim((string)$data['firstName']), 0, 100); if (!$v) return $this->json(['error' => 'Le prénom ne peut pas être vide.'], 422); $passport->setFirstName($v); }
        if (isset($data['lastName'])) { $v = mb_substr(trim((string)$data['lastName']), 0, 100); $passport->setLastName($v); }
        if (array_key_exists('birthDate', $data)) {
            $bd = $data['birthDate'] ?: null;
            if ($bd !== null) {
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $bd)) {
                    return $this->json(['error' => 'Format de date de naissance invalide (attendu : YYYY-MM-DD).'], 422);
                }
                // Vérifier âge réaliste (16-120 ans)
                try {
                    $dob  = new \DateTimeImmutable($bd);
                    $age  = (int) $dob->diff(new \DateTimeImmutable())->y;
                    if ($age < 16 || $age > 120) return $this->json(['error' => 'Date de naissance invalide.'], 422);
                } catch (\Throwable) {
                    return $this->json(['error' => 'Date de naissance invalide.'], 422);
                }
            }
            $passport->setBirthDate($bd);
        }
        if (array_key_exists('nationality', $data)) { $v = $data['nationality'] ? mb_substr(trim((string)$data['nationality']), 0, 100) : null; $passport->setNationality($v ?: null); }
        if (array_key_exists('phone', $data)) {
            $phone = $data['phone'] ? preg_replace('/[^0-9+\s().-]/', '', (string) $data['phone']) : null;
            if ($phone !== null && mb_strlen($phone) > 30) $phone = null;
            $passport->setPhone($phone ?: null);
        }
        if (array_key_exists('currentAddress', $data)) { $v = $data['currentAddress'] ? mb_substr(trim((string)$data['currentAddress']), 0, 500) : null; $passport->setCurrentAddress($v ?: null); }

        // ── Situation professionnelle ─────────────────────────────────
        $validContracts = ['cdi', 'cdd', 'freelance', 'student', 'retired', 'unemployed'];
        if (isset($data['contractType']) && in_array($data['contractType'], $validContracts, true)) {
            $passport->setContractType($data['contractType']);
        }
        if (isset($data['employer'])) { $v = mb_substr(trim((string)$data['employer']), 0, 255); $passport->setEmployer($v); }
        if (isset($data['monthlyIncome'])) { $v = $data['monthlyIncome'] !== null ? (float) $data['monthlyIncome'] : null; if ($v !== null && ($v < 0 || $v > 500000)) return $this->json(['error' => 'Revenus invalides.'], 422); $passport->setMonthlyIncome($v); }
        if (isset($data['employmentDuration'])) $passport->setEmploymentDuration(trim((string) $data['employmentDuration']));

        // ── Garant ───────────────────────────────────────────────────
        $validRelations = ['none', 'parent', 'spouse', 'other'];
        if (isset($data['guarantorRelation']) && in_array($data['guarantorRelation'], $validRelations, true)) {
            $passport->setGuarantorRelation($data['guarantorRelation']);
        }
        if (isset($data['guarantorName'])) { $v = mb_substr(trim((string)$data['guarantorName']), 0, 255); $passport->setGuarantorName($v); }
        if (isset($data['guarantorIncome'])) { $v = $data['guarantorIncome'] !== null ? (float) $data['guarantorIncome'] : null; if ($v !== null && ($v < 0 || $v > 500000)) return $this->json(['error' => 'Revenus garant invalides.'], 422); $passport->setGuarantorIncome($v); }

        // ── Préférences ───────────────────────────────────────────────
        if (isset($data['maxRent'])) {
            $v = $data['maxRent'] !== null ? (float) $data['maxRent'] : null;
            if ($v !== null && ($v < 0 || $v > 50000)) return $this->json(['error' => 'Budget maximum invalide.'], 422);
            $passport->setMaxRent($v);
        }
        if (isset($data['minSurface'])) {
            $v = $data['minSurface'] !== null ? (float) $data['minSurface'] : null;
            if ($v !== null && ($v < 0 || $v > 2000)) return $this->json(['error' => 'Surface minimum invalide.'], 422);
            $passport->setMinSurface($v);
        }
        if (array_key_exists('preferredCity', $data)) { $v = $data['preferredCity'] ? mb_substr(trim((string)$data['preferredCity']), 0, 500) : null; $passport->setPreferredCity($v ?: null); }
        if (array_key_exists('availabilityDate', $data)) {
            $dateStr = $data['availabilityDate'] ?: null;
            if ($dateStr !== null) {
                try {
                    $parsed = new \DateTimeImmutable($dateStr);
                    $dateStr = $parsed->format('Y-m-d'); // Normaliser le format
                } catch (\Throwable) {
                    return $this->json(['error' => 'Format de date de disponibilité invalide (attendu : YYYY-MM-DD).'], 422);
                }
            }
            $passport->setAvailabilityDate($dateStr);
        }
        if (array_key_exists('projectDuration', $data))   $passport->setProjectDuration($data['projectDuration'] ?: null);

        // ── Documents ─────────────────────────────────────────────────
        if (is_array($data['documents'] ?? null)) {
            // SÉCURITÉ : le client ne peut que SUPPRIMER des documents.
            // L'ajout passe par l'endpoint d'upload ; status / reviewComment /
            // verified appartiennent au SERVEUR (sinon un candidat pourrait
            // s'auto-valider ses pièces en forgeant la requête).
            $clientTypes = [];
            foreach ($data['documents'] as $d) {
                if (is_array($d) && isset($d['type'])) $clientTypes[] = (string) $d['type'];
            }
            $kept = array_filter(
                $passport->getDocuments(),
                fn(array $srv) => in_array($srv['type'] ?? '', $clientTypes, true)
            );
            $passport->setDocuments(array_values($kept));
        }

        // ── Visibilité ────────────────────────────────────────────────
        if (isset($data['visibleToOwners'])) {
            $passport->setVisibleToOwners((bool) $data['visibleToOwners']);
        }

        // ── Recalcul automatique ──────────────────────────────────────
        $passport->recalculateCompletion();
        $passport->touch();

        $em->flush();

        return $this->json($this->serializeFull($passport), $isNew ? 201 : 200);
    }

    // ─────────────────────────────────────────────────────────────────
    // GET CANDIDATE'S PASSPORT — GET /api/rental-passport/{userId}
    //   Propriétaire uniquement, avec vérification candidature active
    // ─────────────────────────────────────────────────────────────────
    #[Route('/{userId}', methods: ['GET'])]
    public function getForOwner(string $userId, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $viewer */
        $viewer   = $sec->getUser();
        $viewerRoles = $viewer->getRoles();
        $isOwner  = in_array('ROLE_OWNER', $viewerRoles, true) || in_array('ROLE_AGENCY', $viewerRoles, true);

        if (!$isOwner) return $this->json(['error' => 'Accès refusé.'], 403);

        // RGPD : vérifier qu'une candidature active existe vers l'une des campagnes du propriétaire
        $hasLegitimateInterest = $this->verifyLegitimateInterest($viewer->getId(), $userId, $em);
        if (!$hasLegitimateInterest) {
            return $this->json(['error' => 'Accès refusé : aucune candidature active de cet utilisateur.'], 403);
        }

        $passport = $em->getRepository(RentalPassport::class)->findOneBy(['userId' => $userId]);
        if (!$passport) return $this->json(['error' => 'Dossier introuvable.'], 404);

        // Respecter la préférence de visibilité du candidat
        if (!$passport->isVisibleToOwners()) {
            return $this->json(['error' => 'Ce candidat a rendu son dossier privé.'], 403);
        }

        return $this->json($this->serializeForOwner($passport));
    }

    // ─────────────────────────────────────────────────────────────────
    // DELETE — DELETE /api/rental-passport (droit à l'oubli RGPD)
    // ─────────────────────────────────────────────────────────────────
    #[Route('', methods: ['DELETE'])]
    public function delete(EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user     = $sec->getUser();
        $passport = $em->getRepository(RentalPassport::class)->findOneBy(['userId' => $user->getId()]);

        if (!$passport) return $this->json(['error' => 'Aucun Rental Passport trouvé.'], 404);

        // Vérifier absence de candidatures actives
        $activeApps = $em->getRepository(Application::class)->findBy(['candidateId' => $user->getId()]);
        $hasActive  = count(array_filter($activeApps, fn($a) => $a->isActive())) > 0;

        if ($hasActive) {
            return $this->json([
                'error' => 'Vous avez des candidatures actives. Retirez-les avant de supprimer votre dossier.',
            ], 409);
        }

        // Supprimer les messages liés (RGPD — droit à l'oubli)
        // On réutilise $activeApps déjà chargé (évite race condition + double requête)
        foreach ($activeApps as $app) {
            $messages = $em->getRepository(\App\Entity\Message::class)->findBy(['applicationId' => $app->getId()]);
            foreach ($messages as $msg) {
                $em->remove($msg);
            }
            $em->remove($app);
        }

        $em->remove($passport);
        $em->flush();

        return $this->json(['deleted' => true, 'message' => 'Votre Rental Passport et toutes les données associées ont été supprimés conformément au RGPD.']);
    }

    // ─────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────

    /**
     * Vérifie qu'un propriétaire a une raison légitime d'accéder au passport d'un candidat.
     * Condition : le candidat a une candidature active vers une campagne du propriétaire.
     *
     * Implémentation en 2 requêtes simples (évite JOIN non-mappé invalide en Doctrine DQL) :
     *   1. Récupérer les IDs des campagnes du propriétaire
     *   2. Vérifier qu'une candidature active du candidat existe sur l'une d'elles
     */
    private function verifyLegitimateInterest(string $ownerId, string $candidateId, EntityManagerInterface $em): bool
    {
        // Requête 1 : IDs des campagnes du propriétaire (leger — juste les IDs)
        $campaignIds = $em->createQuery(
            'SELECT c.id FROM App\Entity\Campaign c WHERE c.ownerId = :ownerId'
        )
        ->setParameter('ownerId', $ownerId)
        ->getSingleColumnResult();

        if (empty($campaignIds)) return false;

        // Requête 2 : candidature active du candidat sur l'une de ces campagnes
        $count = $em->createQuery(
            'SELECT COUNT(a.id) FROM App\Entity\Application a
             WHERE a.campaignId IN (:ids)
               AND a.candidateId = :candidateId
               AND a.status NOT IN (:closed)'
        )
        ->setParameter('ids',         $campaignIds)
        ->setParameter('candidateId', $candidateId)
        ->setParameter('closed',      ['refused', 'accepted'])
        ->getSingleScalarResult();

        return (int) $count > 0;
    }

    private function serializeFull(RentalPassport $p): array
    {
        return [
            'id'                 => $p->getId(),
            'userId'             => $p->getUserId(),
            'firstName'          => $p->getFirstName(),
            'lastName'           => $p->getLastName(),
            'birthDate'          => $p->getBirthDate(),
            'nationality'        => $p->getNationality(),
            'phone'              => $p->getPhone(),
            'currentAddress'     => $p->getCurrentAddress(),
            'contractType'       => $p->getContractType(),
            'employer'           => $p->getEmployer(),
            'monthlyIncome'      => $p->getMonthlyIncome(),
            'employmentDuration' => $p->getEmploymentDuration(),
            'guarantorRelation'  => $p->getGuarantorRelation(),
            'guarantorName'      => $p->getGuarantorName(),
            'guarantorIncome'    => $p->getGuarantorIncome(),
            'maxRent'            => $p->getMaxRent(),
            'minSurface'         => $p->getMinSurface(),
            'preferredCity'      => $p->getPreferredCity(),
            'availabilityDate'   => $p->getAvailabilityDate(),
            'projectDuration'    => $p->getProjectDuration(),
            'documents'          => $p->getDocuments(),
            'completionRate'     => $p->getCompletionRate(),
            'cachedScore'        => $p->getCachedScore(),
            'visibleToOwners'    => $p->isVisibleToOwners(),
            'createdAt'          => $p->getCreatedAt()->format('c'),
            'updatedAt'          => $p->getUpdatedAt()?->format('c'),
            'exists'             => true,
        ];
    }

    /** Vue limitée pour les propriétaires — RGPD data minimization */
    private function serializeForOwner(RentalPassport $p): array
    {
        return [
            'id'                 => $p->getId(),
            'firstName'          => $p->getFirstName(),
            'lastName'           => $p->getLastName(),
            'phone'              => $p->getPhone(),
            'contractType'       => $p->getContractType(),
            'employer'           => $p->getEmployer(),
            'monthlyIncome'      => $p->getMonthlyIncome(),
            'employmentDuration' => $p->getEmploymentDuration(),
            'guarantorRelation'  => $p->getGuarantorRelation(),
            'guarantorName'      => $p->getGuarantorName(),
            'guarantorIncome'    => $p->getGuarantorIncome(),
            'availabilityDate'   => $p->getAvailabilityDate(),
            'preferredCity'      => $p->getPreferredCity(),
            'projectDuration'    => $p->getProjectDuration(),
            'documents'          => $p->getDocuments(), // types et statuts — pas les URLs brutes
            'completionRate'     => $p->getCompletionRate(),
            // cachedScore non exposé au propriétaire (score officiel calculé par ScoringService sur l'Application)
            'updatedAt'          => $p->getUpdatedAt()?->format('c'),
        ];
    }
}
