<?php
declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Campaign;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Routes PUBLIQUES — aucune authentification requise.
 *
 * Permettent à n'importe qui de consulter une annonce publiée
 * via le lien partagé par le propriétaire.
 *
 * Ajouter dans config/packages/security.yaml access_control :
 *   - { path: ^/api/annonces, roles: PUBLIC_ACCESS }
 */
#[Route('/api/annonces')]
final class PublicCampaignController extends AbstractController
{
    private readonly string $uploadUrl;
    private readonly RateLimiterFactory $publicLimiter;

    public function __construct(string $uploadUrl, RateLimiterFactory $publicLimiter)
    {
        $this->uploadUrl    = $uploadUrl;
        $this->publicLimiter = $publicLimiter;
    }

    // ─────────────────────────────────────────────────────────────────
    // GET /api/annonces/{id} — publique, sans JWT
    // ─────────────────────────────────────────────────────────────────
    #[Route('/{id}', methods: ['GET'])]
    public function show(string $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        // Rate limiting par IP : 60 requêtes/minute (scraping protection)
        $ip      = $request->getClientIp() ?? 'unknown';
        $limiter = $this->publicLimiter->create('public_campaign_' . md5($ip));
        if (!$limiter->consume(1)->isAccepted()) {
            return $this->json(['error' => 'Trop de requêtes. Réessayez dans un moment.'], 429);
        }

        // Accepte le slug public (spec: /c/{slug}) ou l'UUID
        $campaign = $em->getRepository(Campaign::class)->findOneBy(['slug' => $id])
                  ?? $em->getRepository(Campaign::class)->find($id);

        if (!$campaign || !$campaign->isPublished()) {
            return $this->json(['error' => 'Annonce introuvable ou non disponible.'], 404);
        }

        // Résoudre les URLs des photos en absolues
        $photos = array_map(
            fn($p) => str_starts_with($p, 'http') ? $p : $this->uploadUrl . $p,
            $campaign->getPhotos()
        );

        return $this->json([
            'id'                => $campaign->getId(),
            'title'             => $campaign->getTitle(),
            'subtitle'          => $campaign->getSubtitle(),
            'propertyType'      => $campaign->getPropertyType(),
            // RGPD : adresse exacte masquée si le propriétaire l'a choisi
            'address'           => $campaign->getPublicAddress(),
            'preciseAddress'    => $campaign->isPreciseAddressVisible(),
            'surface'           => $campaign->getSurface(),
            'rooms'             => $campaign->getRooms(),
            'bedrooms'          => $campaign->getBedrooms(),
            'bathrooms'         => $campaign->getBathrooms(),
            'floor'             => $campaign->getFloor(),
            'rent'              => $campaign->getRent(),
            'charges'           => $campaign->getCharges(),
            'deposit'           => $campaign->getDeposit(),
            'rentalType'        => $campaign->getRentalType(),
            'minDuration'       => $campaign->getMinDuration(),
            'description'       => $campaign->getDescription(),
            'amenities'         => $campaign->getAmenities(),
            'photos'            => $photos,
            'documentsRequired' => $campaign->getDocumentsRequired(),
            'availableAt'       => $campaign->getAvailableAt()?->format('Y-m-d'),
            'dpe'               => $campaign->getDpe(),
            'ges'               => $campaign->getGes(),
            'floor'             => $campaign->getFloor(),
            'hasElevator'       => $campaign->hasElevator(),
            'heatingType'       => $campaign->getHeatingType(),
            'extras'            => $campaign->getExtras(),
            'slug'              => $campaign->getSlug(),
            // RGPD : profil propriétaire minimisé (prénom + initiale, ancienneté, bio choisie)
            'owner'             => $this->publicOwner($campaign, $em),
            'publishedAt'       => $campaign->getPublishedAt()?->format('c'),
            // Pas d'ownerId, pas d'organizationId — confidentialité
        ]);
    }

    /** Profil public du propriétaire — uniquement des données non identifiantes qu'il contrôle. */
    private function publicOwner(Campaign $campaign, EntityManagerInterface $em): ?array
    {
        $owner = $em->getRepository(\App\Entity\User::class)->find($campaign->getOwnerId());
        if (!$owner) return null;

        $activeCount = (int) $em->createQuery(
            'SELECT COUNT(c.id) FROM App\Entity\Campaign c WHERE c.ownerId = :oid AND c.status = :st'
        )->setParameter('oid', $owner->getId())->setParameter('st', 'active')->getSingleScalarResult();

        return [
            'name'            => $owner->getFirstName() . ' ' . mb_substr($owner->getLastName(), 0, 1) . '.',
            'memberSince'     => $owner->getCreatedAt()->format('Y-m'),
            'activeCampaigns' => $activeCount,
            'bio'             => $owner->getPublicBio(),
            // Indicateur de confiance : délai médian de réponse aux candidats
            // (calculé sur les vrais échanges — aucune donnée personnelle exposée)
            'responseTime'    => $this->responseTimeLabel($owner->getId(), $em),
        ];
    }

    /**
     * Délai médian (heures) entre un message candidat et la réponse du
     * propriétaire, sur les 200 derniers messages de ses campagnes.
     * Renvoie un libellé grossier (jamais de données brutes) ou null.
     */
    private function responseTimeLabel(string $ownerId, EntityManagerInterface $em): ?string
    {
        $messages = $em->createQuery(
            'SELECT m.campaignId, m.candidateId, m.senderRole, m.createdAt
             FROM App\Entity\Message m
             JOIN App\Entity\Campaign c WITH c.id = m.campaignId
             WHERE c.ownerId = :oid
             ORDER BY m.createdAt ASC'
        )->setParameter('oid', $ownerId)->setMaxResults(200)->getArrayResult();

        // Regrouper par fil (campagne, candidat) et mesurer candidat → réponse owner
        $threads = [];
        foreach ($messages as $m) {
            $threads[($m['campaignId'] ?? '') . '|' . ($m['candidateId'] ?? '')][] = $m;
        }
        $delays = [];
        foreach ($threads as $msgs) {
            $pending = null;
            foreach ($msgs as $m) {
                if ($m['senderRole'] === 'candidate') {
                    $pending ??= $m['createdAt'];
                } elseif ($m['senderRole'] === 'owner' && $pending !== null) {
                    $delays[] = ($m['createdAt']->getTimestamp() - $pending->getTimestamp()) / 3600;
                    $pending  = null;
                }
            }
        }
        if (count($delays) < 2) return null; // échantillon trop faible pour être honnête

        sort($delays);
        $median = $delays[intdiv(count($delays), 2)];
        if ($median <= 4)  return 'Répond généralement en quelques heures';
        if ($median <= 24) return 'Répond généralement sous 24 h';
        if ($median <= 72) return 'Répond généralement sous 3 jours';
        return null; // au-delà : ne rien afficher plutôt que pénaliser
    }
}
