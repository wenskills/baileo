<?php
declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Application;
use App\Entity\Campaign;
use App\Entity\User;
use App\Entity\VisitFeedback;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Fiche ressenti après visite.
 * STRICTEMENT PRIVÉE : jamais lisible par le candidat, sous aucune forme.
 * Le retour au candidat passe par un MESSAGE que le propriétaire choisit.
 */
#[Route('/api/applications/{id}/visit-feedback')]
final class VisitFeedbackController extends AbstractController
{
    // GET — la fiche (propriétaire uniquement)
    #[Route('', methods: ['GET'])]
    public function get(string $id, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        [$app, $err] = $this->authorizeOwner($id, $em, $sec);
        if ($err) return $err;

        $fb = $em->getRepository(VisitFeedback::class)->findOneBy(['applicationId' => $app->getId()]);
        return $this->json(['data' => $fb ? $this->serialize($fb) : null]);
    }

    // PUT — créer/mettre à jour la fiche (propriétaire uniquement)
    #[Route('', methods: ['PUT', 'POST'])]
    public function upsert(string $id, Request $request, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        [$app, $err] = $this->authorizeOwner($id, $em, $sec);
        if ($err) return $err;

        $decoded = json_decode($request->getContent(), true);
        $data    = is_array($decoded) ? $decoded : [];

        $fb = $em->getRepository(VisitFeedback::class)->findOneBy(['applicationId' => $app->getId()]);
        if (!$fb) {
            $fb = new VisitFeedback();
            $fb->setApplicationId($app->getId());
            $em->persist($fb);
        } else {
            $fb->touch();
        }

        $toInt = fn($v) => ($v === null || $v === '') ? null : (int) $v;
        $fb->setPunctuality($toInt($data['punctuality'] ?? null))
           ->setPresentation($toInt($data['presentation'] ?? null))
           ->setCommunication($toInt($data['communication'] ?? null))
           ->setInterest($toInt($data['interest'] ?? null))
           ->setCompatibility($toInt($data['compatibility'] ?? null))
           ->setPositives($data['positives'] ?? null)
           ->setNegatives($data['negatives'] ?? null)
           ->setComment($data['comment'] ?? null);

        $em->flush();
        // AUCUNE notification au candidat : la fiche est privée par conception.
        return $this->json(['data' => $this->serialize($fb)]);
    }

    /** @return array{0: ?Application, 1: ?JsonResponse} */
    private function authorizeOwner(string $id, EntityManagerInterface $em, Security $sec): array
    {
        $app = $em->getRepository(Application::class)->find($id);
        if (!$app) return [null, $this->json(['error' => 'Candidature introuvable.'], 404)];

        $campaign = $em->getRepository(Campaign::class)->find($app->getCampaignId());
        /** @var User $user */
        $user = $sec->getUser();
        if (!$campaign || !$campaign->isOwner($user->getId())) {
            // 404 volontaire côté candidat : il ne doit même pas savoir que la fiche existe
            return [null, $this->json(['error' => 'Introuvable.'], 404)];
        }
        return [$app, null];
    }

    private function serialize(VisitFeedback $fb): array
    {
        return [
            'punctuality'   => $fb->getPunctuality(),
            'presentation'  => $fb->getPresentation(),
            'communication' => $fb->getCommunication(),
            'interest'      => $fb->getInterest(),
            'compatibility' => $fb->getCompatibility(),
            'positives'     => $fb->getPositives(),
            'negatives'     => $fb->getNegatives(),
            'comment'       => $fb->getComment(),
            'updatedAt'     => ($fb->getUpdatedAt() ?? $fb->getCreatedAt())->format('c'),
        ];
    }
}
