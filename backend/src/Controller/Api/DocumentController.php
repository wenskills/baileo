<?php
declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Application;
use App\Entity\Campaign;
use App\Entity\DocumentAccessLog;
use App\Entity\RentalPassport;
use App\Entity\User;
use App\Service\ActivityService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;

/**
 * Upload et suppression des documents du Rental Passport.
 *
 * Stockage : public/uploads/passport/{userId}/{type}-{uuid}.{ext}
 * URL      : /uploads/passport/{userId}/{type}-{uuid}.{ext}
 *
 * Sécurité :
 *  - Upload/delete : candidat propriétaire du passport uniquement
 *  - Max 20 documents, 10 Mo par fichier
 *  - MIME : PDF, JPEG, PNG, WebP
 *  - Nom de fichier : {type}-{uuid}.{ext} — jamais le nom original
 *  - Validation intégrité : getimagesize ou mime_content_type
 */
final class DocumentController extends AbstractController
{
    private const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 Mo
    private const MAX_DOCS       = 20;
    private const ALLOWED_MIMES  = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
    ];
    private const VALID_TYPES = [
        'identity', 'domicile', 'contract', 'payslips',
        'tax', 'rib', 'insurance', 'guarantor_id', 'guarantor_income',
    ];

    public function __construct(
        private readonly string $uploadDir,
        private readonly string $uploadUrl,
        private readonly ActivityService $activity
    ) {}

    // ─────────────────────────────────────────────────────────────────
    // UPLOAD — POST /api/rental-passport/documents
    // Champs multipart : document (fichier), type (string)
    // ─────────────────────────────────────────────────────────────────
    #[Route('/api/rental-passport/documents', methods: ['POST'])]
    public function upload(Request $request, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user = $sec->getUser();

        // Seuls les candidats peuvent uploader des documents dans leur passport
        if (!in_array('ROLE_CANDIDATE', $user->getRoles(), true)) {
            return $this->json(['error' => 'Seuls les candidats peuvent gérer leur Rental Passport.'], 403);
        }

        $passport = $em->getRepository(RentalPassport::class)->findOneBy(['userId' => $user->getId()]);

        if (!$passport) {
            return $this->json(['error' => 'Rental Passport introuvable. Créez-le d\'abord.'], 404);
        }

        // Vérifier le type de document
        $docType = trim((string) $request->request->get('type', ''));
        if (!in_array($docType, self::VALID_TYPES, true)) {
            return $this->json([
                'error'   => 'Type de document invalide.',
                'allowed' => self::VALID_TYPES,
            ], 422);
        }

        // Vérifier la limite
        $docs = $passport->getDocuments();
        if (count($docs) >= self::MAX_DOCS) {
            return $this->json(['error' => 'Maximum ' . self::MAX_DOCS . ' documents.'], 422);
        }

        $file = $request->files->get('document');
        if (!$file) {
            return $this->json(['error' => 'Aucun fichier fourni (champ attendu : "document").'], 422);
        }

        // ── Validation taille ─────────────────────────────────────
        if ($file->getSize() > self::MAX_SIZE_BYTES) {
            return $this->json([
                'error' => sprintf(
                    'Fichier trop lourd (max 10 Mo). Reçu : %.1f Mo.',
                    $file->getSize() / 1024 / 1024
                ),
            ], 422);
        }

        // ── Validation MIME ────────────────────────────────────────
        $mime = $file->getMimeType();
        if (!in_array($mime, self::ALLOWED_MIMES, true)) {
            return $this->json([
                'error'    => 'Format non supporté. Acceptés : PDF, JPG, PNG, WebP.',
                'received' => $mime,
            ], 422);
        }

        // ── Extension sécurisée ───────────────────────────────────
        $ext = match ($mime) {
            'application/pdf' => 'pdf',
            'image/jpeg'      => 'jpg',
            'image/png'       => 'png',
            'image/webp'      => 'webp',
            default           => 'bin',
        };

        $filename = $docType . '-' . Uuid::v4()->toRfc4122() . '.' . $ext;

        // ── Répertoire de destination ──────────────────────────────
        // SÉCURITÉ : documents personnels stockés HORS de la racine web —
        // jamais servis par nginx, uniquement via l'endpoint download authentifié + journalisé
        $destDir = $this->privateDir() . '/' . $user->getId();
        if (!is_dir($destDir) && !mkdir($destDir, 0755, true)) {
            return $this->json(['error' => 'Impossible de créer le répertoire.'], 500);
        }

        // ── Déplacer le fichier ────────────────────────────────────
        try {
            $originalName = mb_substr(preg_replace('/[^\w\-. ]/u', '_', (string) $file->getClientOriginalName()), 0, 120) ?: $filename;
        $file->move($destDir, $filename);
        } catch (\Throwable $e) {
            return $this->json(['error' => 'Erreur upload : ' . $e->getMessage()], 500);
        }

        $fullPath = $destDir . '/' . $filename;

        // ── Vérification intégrité pour les images ─────────────────
        if ($mime !== 'application/pdf') {
            if (@getimagesize($fullPath) === false) {
                @unlink($fullPath);
                return $this->json(['error' => 'Fichier image invalide ou corrompu.'], 422);
            }
        }

        // ── Supprimer l'ancien fichier physique APRÈS déplacement réussi ───
        // (ordre important : ne pas supprimer l'ancien avant d'être sûr que le nouveau est en place)
        $relativeUrl = '/api/documents/' . $user->getId() . '/' . $docType . '/download';
        foreach ($docs as $existing) {
            if ($existing['type'] === $docType && !empty($existing['url'])) {
                // L'URL est de la forme /uploads/passport/{userId}/{filename}
                // On en extrait le chemin relatif au uploadDir
                $oldRelPath = ltrim(str_replace('/uploads', '', $existing['url']), '/');
                $oldFullPath = rtrim($this->uploadDir, '/') . '/' . $oldRelPath;
                if (file_exists($oldFullPath)) @unlink($oldFullPath);
            }
        }
        $updatedDocs = array_filter($docs, fn($d) => $d['type'] !== $docType);

        // ── Ajouter le nouveau document ────────────────────────────
        $updatedDocs[] = [
            'type'       => $docType,
            'file'       => $filename,           // nom disque (jamais exposé en URL publique)
            'name'       => $originalName,
            'url'        => $relativeUrl,
            'uploadedAt' => (new \DateTimeImmutable())->format('c'),
            'size'       => filesize($fullPath),
            'mime'       => $mime,
            'verified'   => false,
        ];

        $passport->setDocuments(array_values($updatedDocs));
        $passport->recalculateCompletion();
        $passport->touch();
        $em->flush();

        return $this->json([
            'type'       => $docType,
            'name'       => $filename,
            'url'        => $this->uploadUrl . $relativeUrl,
            'relative'   => $relativeUrl,
            'size'       => filesize($fullPath),
            'mime'       => $mime,
            'uploadedAt' => (new \DateTimeImmutable())->format('c'),
            'completionRate' => $passport->getCompletionRate(),
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────
    // DELETE — DELETE /api/rental-passport/documents/{filename}
    // ─────────────────────────────────────────────────────────────────
    #[Route('/api/rental-passport/documents/{filename}', methods: ['DELETE'])]
    public function delete(string $filename, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user = $sec->getUser();

        if (!in_array('ROLE_CANDIDATE', $user->getRoles(), true)) {
            return $this->json(['error' => 'Accès refusé.'], 403);
        }

        $passport = $em->getRepository(RentalPassport::class)->findOneBy(['userId' => $user->getId()]);

        if (!$passport) return $this->json(['error' => 'Passport introuvable.'], 404);

        // Sécurité : basename uniquement
        $safe = basename($filename);
        if ($safe !== $filename || str_contains($filename, '..') || str_contains($filename, '/')) {
            return $this->json(['error' => 'Nom de fichier invalide.'], 422);
        }

        $docs    = $passport->getDocuments();
        $relUrl  = '/uploads/passport/' . $user->getId() . '/' . $safe;
        $found   = array_filter($docs, fn($d) => ($d['url'] ?? '') === $relUrl);

        if (empty($found)) {
            return $this->json(['error' => 'Document introuvable.'], 404);
        }

        // Supprimer le fichier physique
        $fullPath = rtrim($this->uploadDir, '/') . '/passport/' . $user->getId() . '/' . $safe;
        if (file_exists($fullPath)) @unlink($fullPath);

        // Mettre à jour la liste
        $passport->setDocuments(array_values(array_filter($docs, fn($d) => ($d['url'] ?? '') !== $relUrl)));
        $passport->recalculateCompletion();
        $passport->touch();
        $em->flush();

        return $this->json([
            'deleted'        => true,
            'filename'       => $safe,
            'completionRate' => $passport->getCompletionRate(),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────
    // REVIEW — POST /api/passport/{candidateId}/documents/{type}/review
    //   Le propriétaire valide ou refuse un document (spec Phase 2).
    //   Accès : intérêt légitime = le candidat a une candidature sur une
    //   de SES campagnes. Le candidat est notifié immédiatement.
    // ─────────────────────────────────────────────────────────────────
    #[Route('/api/passport/{candidateId}/documents/{type}/review', methods: ['POST'])]
    public function review(
        string $candidateId,
        string $type,
        Request $request,
        EntityManagerInterface $em,
        Security $sec,
    ): JsonResponse {
        /** @var User $user */
        $user = $sec->getUser();

        // Intérêt légitime : une candidature du candidat sur une campagne du propriétaire
        $application = $em->createQuery(
            'SELECT a FROM App\Entity\Application a
             JOIN App\Entity\Campaign c WITH c.id = a.campaignId
             WHERE a.candidateId = :caid AND c.ownerId = :oid
             ORDER BY a.createdAt DESC'
        )->setParameter('caid', $candidateId)
         ->setParameter('oid', $user->getId())
         ->setMaxResults(1)
         ->getOneOrNullResult();
        if (!$application) {
            return $this->json(['error' => 'Accès refusé : aucun dossier de ce candidat sur vos campagnes.'], 403);
        }

        $passport = $em->getRepository(RentalPassport::class)->findOneBy(['userId' => $candidateId]);
        if (!$passport) return $this->json(['error' => 'Dossier introuvable.'], 404);

        $decoded = json_decode($request->getContent(), true);
        $data    = is_array($decoded) ? $decoded : [];
        $action  = (string) ($data['action'] ?? '');
        if (!in_array($action, ['validate', 'reject'], true)) {
            return $this->json(['error' => 'Action invalide (validate|reject).'], 422);
        }
        $comment = mb_substr(strip_tags(trim((string) ($data['comment'] ?? ''))), 0, 500);
        if ($action === 'reject' && $comment === '') {
            return $this->json(['error' => 'Un motif est requis pour refuser un document.'], 422);
        }

        // Localiser le document par type dans le passport
        $docs  = $passport->getDocuments();
        $found = false;
        $labels = [
            'identity' => 'Pièce d\'identité', 'domicile' => 'Justificatif de domicile',
            'contract' => 'Contrat de travail', 'payslips' => 'Fiches de paie',
            'tax' => 'Avis d\'imposition', 'rib' => 'RIB', 'insurance' => 'Attestation d\'assurance',
            'guarantor_id' => 'Pièce d\'identité du garant', 'guarantor_income' => 'Revenus du garant',
        ];
        foreach ($docs as &$doc) {
            if (($doc['type'] ?? '') === $type) {
                $doc['status']        = $action === 'validate' ? 'validated' : 'rejected';
                $doc['verified']      = $action === 'validate';
                $doc['reviewComment'] = $comment ?: null;
                $doc['reviewedAt']    = (new \DateTimeImmutable())->format('c');
                $found = true;
                break;
            }
        }
        unset($doc);
        if (!$found) return $this->json(['error' => 'Document introuvable.'], 404);

        $passport->setDocuments($docs);
        $passport->touch();

        $label = $labels[$type] ?? $type;
        if ($action === 'validate') {
            $this->activity->log($application->getId(), 'document_added',
                'Document validé : ' . $label . '.', $user->getId(), 'owner');
            $this->activity->notify($candidateId, 'document_uploaded',
                'Document validé', 'Votre document « ' . $label . ' » a été validé par le propriétaire.',
                '/rental-passport');
        } else {
            $this->activity->log($application->getId(), 'document_added',
                'Document refusé : ' . $label . ' — ' . $comment, $user->getId(), 'owner');
            $this->activity->notify($candidateId, 'document_requested',
                'Document à corriger', '« ' . $label . ' » : ' . $comment . ' — Merci de téléverser une nouvelle version.',
                '/rental-passport');
        }

        $em->persist(new DocumentAccessLog($candidateId, $type, $user->getId(), $action === 'validate' ? 'validate' : 'reject', $request->getClientIp()));
        $em->flush();
        return $this->json(['type' => $type, 'status' => $action === 'validate' ? 'validated' : 'rejected', 'reviewComment' => $comment ?: null]);
    }

    /** Répertoire privé hors racine web (persiste via le bind mount ./backend). */
    private function privateDir(): string
    {
        $dir = \dirname($this->uploadDir) . '/../var/private_uploads/passport';
        if (!is_dir($dir)) @mkdir($dir, 0777, true);
        return $dir;
    }

    // ─────────────────────────────────────────────────────────────────
    // DOWNLOAD — GET /api/documents/{candidateId}/{type}/download
    //   SEUL point d'accès aux pièces : droits vérifiés + accès JOURNALISÉ.
    //   Autorisés : le candidat lui-même, ou un propriétaire ayant une
    //   candidature de ce candidat sur une de ses campagnes.
    // ─────────────────────────────────────────────────────────────────
    #[Route('/api/documents/{candidateId}/{type}/download', methods: ['GET'])]
    public function download(
        string $candidateId,
        string $type,
        Request $request,
        EntityManagerInterface $em,
        Security $sec,
    ): Response {
        /** @var User $user */
        $user   = $sec->getUser();
        $isSelf = $user->getId() === $candidateId;

        if (!$isSelf) {
            // Intérêt légitime : candidature du candidat sur une campagne de l'appelant
            $application = $em->createQuery(
                'SELECT a FROM App\Entity\Application a
                 JOIN App\Entity\Campaign c WITH c.id = a.campaignId
                 WHERE a.candidateId = :caid AND c.ownerId = :oid'
            )->setParameter('caid', $candidateId)
             ->setParameter('oid', $user->getId())
             ->setMaxResults(1)->getOneOrNullResult();
            if (!$application) {
                return $this->json(['error' => ['code' => 'DOCUMENT_ACCESS_DENIED', 'message' => 'Vous n\'avez pas accès à ce document.']], 403);
            }
        }

        $passport = $em->getRepository(RentalPassport::class)->findOneBy(['userId' => $candidateId]);
        $doc = null;
        foreach (($passport?->getDocuments() ?? []) as $d) {
            if (($d['type'] ?? '') === $type) { $doc = $d; break; }
        }
        if (!$doc) return $this->json(['error' => ['code' => 'RESOURCE_NOT_FOUND', 'message' => 'Document introuvable.']], 404);

        // Résolution disque : nouveau stockage privé, puis legacy public (compat données existantes)
        $fname = $doc['file'] ?? basename((string) ($doc['url'] ?? ''));
        $candidates = [
            $this->privateDir() . '/' . $candidateId . '/' . $fname,
            rtrim($this->uploadDir, '/') . '/passport/' . $candidateId . '/' . $fname,
        ];
        $path = null;
        foreach ($candidates as $p) { if ($fname && is_file($p)) { $path = $p; break; } }
        if (!$path) return $this->json(['error' => ['code' => 'RESOURCE_NOT_FOUND', 'message' => 'Fichier indisponible.']], 404);

        // Journalisation RGPD (les consultations par le candidat lui-même ne sont pas loguées)
        if (!$isSelf) {
            $em->persist(new DocumentAccessLog($candidateId, $type, $user->getId(), 'download', $request->getClientIp()));
            $em->flush();
        }

        $resp = new BinaryFileResponse($path);
        $resp->setContentDisposition('inline', preg_replace('/[^\w\-. ]/u', '_', (string) ($doc['name'] ?? $fname)));
        $resp->headers->set('X-Content-Type-Options', 'nosniff');
        return $resp;
    }

    // ─────────────────────────────────────────────────────────────────
    // ACCESS LOG — GET /api/documents/access-log
    //   Le CANDIDAT voit qui a consulté ses pièces (transparence RGPD).
    // ─────────────────────────────────────────────────────────────────
    #[Route('/api/documents/access-log', methods: ['GET'])]
    public function accessLog(EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user = $sec->getUser();
        $logs = $em->getRepository(DocumentAccessLog::class)->findBy(
            ['candidateId' => $user->getId()], ['createdAt' => 'DESC'], 100
        );
        // Noms minimisés des consultants
        $viewerIds = array_values(array_unique(array_map(fn($l) => $l->getViewerId(), $logs)));
        $names = [];
        if ($viewerIds) {
            foreach ($em->getRepository(User::class)->findBy(['id' => $viewerIds]) as $u) {
                $names[$u->getId()] = $u->getFirstName() . ' ' . mb_substr($u->getLastName(), 0, 1) . '.';
            }
        }
        return $this->json(['data' => array_map(fn(DocumentAccessLog $l) => [
            'documentType' => $l->getDocumentType(),
            'viewer'       => $names[$l->getViewerId()] ?? 'Utilisateur',
            'action'       => $l->getAction(),
            'at'           => $l->getCreatedAt()->format('c'),
        ], $logs)]);
    }
}
