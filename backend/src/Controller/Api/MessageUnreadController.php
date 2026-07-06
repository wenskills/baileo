<?php
declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Application;
use App\Entity\Campaign;
use App\Entity\Message;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Compteur global de messages non lus — badge sidebar.
 */
#[Route('/api/messages')]
final class MessageUnreadController extends AbstractController
{
    #[Route('/unread-total', methods: ['GET'])]
    public function unreadTotal(EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user    = $sec->getUser();
        $roles   = $user->getRoles();
        $isOwner = in_array('ROLE_OWNER', $roles, true) || in_array('ROLE_AGENCY', $roles, true);

        $unread = 0;

        if ($isOwner) {
            // Propriétaire: messages candidat non lus sur ses campagnes
            $campaigns = $em->getRepository(Campaign::class)->findBy(['ownerId' => $user->getId()]);
            foreach ($campaigns as $campaign) {
                $apps = $em->getRepository(Application::class)->findBy(['campaignId' => $campaign->getId()]);
                foreach ($apps as $app) {
                    $msgs = $em->getRepository(Message::class)->findBy([
                        'applicationId' => $app->getId(),
                        'senderRole'    => 'candidate',
                        'read'          => false,
                    ]);
                    $unread += count($msgs);
                }
            }
        } else {
            // Candidat: messages propriétaire non lus sur ses candidatures
            $apps = $em->getRepository(Application::class)->findBy(['candidateId' => $user->getId()]);
            foreach ($apps as $app) {
                $msgs = $em->getRepository(Message::class)->findBy([
                    'applicationId' => $app->getId(),
                    'senderRole'    => 'owner',
                    'read'          => false,
                ]);
                $unread += count($msgs);
            }
        }

        // + messages des fils de CONTACT (sans candidature)
        if ($isOwner) {
            $unread += (int) $em->createQuery(
                'SELECT COUNT(m.id) FROM App\Entity\Message m
                 JOIN App\Entity\Campaign c WITH c.id = m.campaignId
                 WHERE c.ownerId = :uid AND m.applicationId IS NULL
                   AND m.read = false AND m.senderId != :uid'
            )->setParameter('uid', $user->getId())->getSingleScalarResult();
        } else {
            $unread += (int) $em->createQuery(
                'SELECT COUNT(m.id) FROM App\Entity\Message m
                 WHERE m.candidateId = :uid AND m.applicationId IS NULL
                   AND m.read = false AND m.senderId != :uid'
            )->setParameter('uid', $user->getId())->getSingleScalarResult();
        }

        return $this->json(['unread' => $unread]);
    }
}
