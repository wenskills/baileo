<?php
declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Campaign;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\String\Slugger\SluggerInterface;

/**
 * Upload, affichage et suppression des photos de campagne.
 *
 * Stockage : public/uploads/campaigns/{campaignId}/{uuid}.{ext}
 * URL publique : /uploads/campaigns/{campaignId}/{uuid}.{ext}
 *
 * Sécurité :
 *  - Upload/delete : propriétaire de la campagne uniquement
 *  - Affichage : tout le monde (fichiers publics via Nginx/Symfony)
 *  - Max 10 photos par campagne
 *  - MIME types : jpeg, png, webp uniquement
 *  - Taille max : 5 Mo par fichier
 *  - Nom sécurisé : UUID + extension blanche — jamais le nom original
 */
#[Route('/api/campaigns/{id}/photos')]
final class PhotoController extends AbstractController
{
    private const MAX_PHOTOS     = 10;
    private const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo
    private const ALLOWED_MIMES  = ['image/jpeg', 'image/png', 'image/webp'];
    private const ALLOWED_EXTS   = ['jpg', 'jpeg', 'png', 'webp'];

    public function __construct(
        private readonly string $uploadDir,   // injecté depuis services.yaml
        private readonly string $uploadUrl,   // URL de base publique
        private readonly SluggerInterface $slugger
    ) {}

    // ─────────────────────────────────────────────────────────────────
    // UPLOAD — POST /api/campaigns/{id}/photos
    // Content-Type: multipart/form-data, champ: "photo"
    // ─────────────────────────────────────────────────────────────────
    #[Route('', methods: ['POST'])]
    public function upload(string $id, Request $request, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        $campaign = $em->getRepository(Campaign::class)->find($id);
        if (!$campaign) return $this->json(['error' => 'Campagne introuvable.'], 404);

        /** @var User $user */
        $user = $sec->getUser();
        if (!$campaign->isOwner($user->getId())) {
            return $this->json(['error' => 'Accès refusé.'], 403);
        }

        // Vérifier la limite de photos
        $current = $campaign->getPhotos();
        if (count($current) >= self::MAX_PHOTOS) {
            return $this->json(['error' => 'Maximum ' . self::MAX_PHOTOS . ' photos par campagne.'], 422);
        }

        $file = $request->files->get('photo');
        if (!$file) {
            return $this->json(['error' => 'Aucun fichier fourni (champ attendu : "photo").'], 422);
        }

        // ── Validation MIME type ────────────────────────────────────
        $mimeType = $file->getMimeType();
        if (!in_array($mimeType, self::ALLOWED_MIMES, true)) {
            return $this->json([
                'error'   => 'Format non supporté. Formats acceptés : JPG, PNG, WebP.',
                'received' => $mimeType,
            ], 422);
        }

        // ── Validation taille ─────────────────────────────────────
        if ($file->getSize() > self::MAX_SIZE_BYTES) {
            return $this->json([
                'error' => 'Fichier trop lourd (max 5 Mo). Reçu : ' . round($file->getSize() / 1024 / 1024, 1) . ' Mo.',
            ], 422);
        }

        // ── Nom de fichier sécurisé (UUID + extension whitelistée) ──
        $ext       = strtolower($file->guessExtension() ?? 'jpg');
        if (!in_array($ext, self::ALLOWED_EXTS, true)) $ext = 'jpg';
        $filename  = \Symfony\Component\Uid\Uuid::v4()->toRfc4122() . '.' . $ext;

        // ── Répertoire de destination ─────────────────────────────
        $destDir = rtrim($this->uploadDir, '/') . '/campaigns/' . $id;
        if (!is_dir($destDir)) {
            if (!mkdir($destDir, 0755, true)) {
                return $this->json(['error' => 'Impossible de créer le répertoire d\'upload.'], 500);
            }
        }

        // ── Déplacer le fichier ────────────────────────────────────
        try {
            $file->move($destDir, $filename);
        } catch (\Throwable $e) {
            return $this->json(['error' => 'Erreur lors du déplacement du fichier : ' . $e->getMessage()], 500);
        }

        // ── Vérification finale (image valide avec GD) ────────────
        $fullPath = $destDir . '/' . $filename;
        $imgInfo  = @getimagesize($fullPath);
        if ($imgInfo === false) {
            @unlink($fullPath);
            return $this->json(['error' => 'Le fichier ne semble pas être une image valide.'], 422);
        }

        // ── Limiter dimensions (optionnel — éviter images aberrantes) ──
        if ($imgInfo[0] > 8000 || $imgInfo[1] > 8000) {
            @unlink($fullPath);
            return $this->json(['error' => 'Image trop grande (max 8000×8000 px).'], 422);
        }

        // ── Enregistrer l'URL relative en DB ─────────────────────
        $relativeUrl = '/uploads/campaigns/' . $id . '/' . $filename;
        $photos      = $current;
        $photos[]    = $relativeUrl;
        $campaign->setPhotos($photos);
        $campaign->touch();
        $em->flush();

        return $this->json([
            'url'      => $this->uploadUrl . $relativeUrl,
            'relative' => $relativeUrl,
            'filename' => $filename,
            'size'     => filesize($fullPath),
            'width'    => $imgInfo[0],
            'height'   => $imgInfo[1],
            'mime'     => $mimeType,
            'total'    => count($photos),
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────
    // DELETE — DELETE /api/campaigns/{id}/photos/{filename}
    // ─────────────────────────────────────────────────────────────────
    #[Route('/{filename}', methods: ['DELETE'])]
    public function delete(string $id, string $filename, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        $campaign = $em->getRepository(Campaign::class)->find($id);
        if (!$campaign) return $this->json(['error' => 'Campagne introuvable.'], 404);

        /** @var User $user */
        $user = $sec->getUser();
        if (!$campaign->isOwner($user->getId())) {
            return $this->json(['error' => 'Accès refusé.'], 403);
        }

        // ── Sécurité : valider que le filename ne contient pas de path traversal ──
        $basename = basename($filename); // supprime tout chemin
        if ($basename !== $filename || str_contains($filename, '..') || str_contains($filename, '/')) {
            return $this->json(['error' => 'Nom de fichier invalide.'], 422);
        }

        // Vérifier l'extension
        $ext = strtolower(pathinfo($basename, PATHINFO_EXTENSION));
        if (!in_array($ext, self::ALLOWED_EXTS, true)) {
            return $this->json(['error' => 'Fichier non reconnu.'], 422);
        }

        $relativeUrl = '/uploads/campaigns/' . $id . '/' . $basename;
        $photos      = $campaign->getPhotos();

        if (!in_array($relativeUrl, $photos, true)) {
            return $this->json(['error' => 'Photo introuvable dans cette campagne.'], 404);
        }

        // ── Supprimer le fichier physique ─────────────────────────
        $fullPath = rtrim($this->uploadDir, '/') . '/campaigns/' . $id . '/' . $basename;
        if (file_exists($fullPath)) {
            @unlink($fullPath);
        }

        // ── Mettre à jour la liste en DB ──────────────────────────
        $campaign->setPhotos(array_values(array_filter($photos, fn($p) => $p !== $relativeUrl)));
        $campaign->touch();
        $em->flush();

        return $this->json(['deleted' => true, 'filename' => $basename]);
    }

    // ─────────────────────────────────────────────────────────────────
    // REORDER — PATCH /api/campaigns/{id}/photos/reorder
    // Body: {"order": ["/uploads/.../a.jpg", "/uploads/.../b.jpg"]}
    // ─────────────────────────────────────────────────────────────────
    #[Route('/reorder', methods: ['PATCH'])]
    public function reorder(string $id, Request $request, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        $campaign = $em->getRepository(Campaign::class)->find($id);
        if (!$campaign) return $this->json(['error' => 'Campagne introuvable.'], 404);

        /** @var User $user */
        $user = $sec->getUser();
        if (!$campaign->isOwner($user->getId())) {
            return $this->json(['error' => 'Accès refusé.'], 403);
        }

        $decoded = json_decode($request->getContent(), true);
        $order   = $decoded['order'] ?? [];

        if (!is_array($order)) {
            return $this->json(['error' => '"order" doit être un tableau d\'URLs.'], 422);
        }

        $current = $campaign->getPhotos();

        // Valider que le nouvel ordre ne contient que des photos existantes
        // ET que chaque URL ne contient pas de path traversal
        foreach ($order as $url) {
            $urlStr = (string) $url;
            if (str_contains($urlStr, '..') || str_contains($urlStr, '\\')) {
                return $this->json(['error' => 'URL invalide.'], 422);
            }
            if (!in_array($urlStr, $current, true)) {
                return $this->json(['error' => 'URL inconnue.'], 422); // Ne pas exposer l'URL
            }
        }

        // Garder les photos non mentionnées en fin de liste
        $remaining = array_values(array_diff($current, $order));
        $campaign->setPhotos(array_merge($order, $remaining));
        $campaign->touch();
        $em->flush();

        return $this->json(['photos' => $campaign->getPhotos()]);
    }
}
