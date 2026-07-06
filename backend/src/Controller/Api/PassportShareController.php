<?php
declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Campaign;
use App\Entity\PassportShare;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Partages du Rental Passport — le candidat voit AVEC QUI son dossier est
 * partagé et peut consulter l'état de chaque partage (RGPD : transparence
 * du consentement). La révocation passe par le retrait de la candidature.
 */
#[Route('/api/passport')]
final class PassportShareController extends AbstractController
{
    #[Route('/shares', methods: ['GET'])]
    public function shares(EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user   = $sec->getUser();
        $shares = $em->getRepository(PassportShare::class)->findBy(
            ['candidateId' => $user->getId()], ['sharedAt' => 'DESC'], 100
        );

        $data = [];
        foreach ($shares as $s) {
            $campaign = $em->getRepository(Campaign::class)->find($s->getCampaignId());
            $owner    = $em->getRepository(User::class)->find($s->getOwnerId());
            $data[] = [
                'id'            => $s->getId(),
                'applicationId' => $s->getApplicationId(),
                'campaignTitle' => $campaign?->getTitle() ?? 'Annonce supprimée',
                'ownerName'     => $owner
                    ? $owner->getFirstName() . ' ' . mb_substr($owner->getLastName(), 0, 1) . '.'
                    : 'Propriétaire',
                'status'        => $s->getStatus(),
                'sharedAt'      => $s->getSharedAt()->format('c'),
                'revokedAt'     => $s->getRevokedAt()?->format('c'),
            ];
        }
        return $this->json(['data' => $data]);
    }
}
