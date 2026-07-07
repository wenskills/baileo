<?php
declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Notification;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Notifications in-app.
 * Confidentialité : un utilisateur ne voit et ne modifie QUE ses propres notifications.
 */
#[Route('/api/notifications')]
final class NotificationController extends AbstractController
{
    // GET /api/notifications?page=1&limit=20
    #[Route('', methods: ['GET'])]
    public function list(Request $request, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user  = $sec->getUser();
        $page  = max(1, (int) $request->query->get('page', 1));
        $limit = max(1, min(50, (int) $request->query->get('limit', 20)));

        $repo  = $em->getRepository(Notification::class);
        $total = $repo->count(['userId' => $user->getId()]);
        $items = $repo->findBy(
            ['userId' => $user->getId()],
            ['createdAt' => 'DESC'],
            $limit,
            ($page - 1) * $limit
        );

        $unread = (int) $em->createQuery(
            'SELECT COUNT(n.id) FROM App\Entity\Notification n WHERE n.userId = :uid AND n.readAt IS NULL'
        )->setParameter('uid', $user->getId())->getSingleScalarResult();

        return $this->json([
            'data' => array_map(fn(Notification $n) => [
                'id'        => $n->getId(),
                'type'      => $n->getType(),
                'title'     => $n->getTitle(),
                'body'      => $n->getBody(),
                'link'      => $n->getLink(),
                'read'      => $n->isRead(),
                'createdAt' => $n->getCreatedAt()->format('c'),
            ], $items),
            'meta' => [
                'page' => $page, 'limit' => $limit, 'total' => $total,
                'totalPages' => (int) ceil($total / $limit),
                'unread' => $unread,
            ],
        ]);
    }

    // GET /api/notifications/unread-count — pour le badge du shell (polling léger)
    #[Route('/unread-count', methods: ['GET'])]
    public function unreadCount(EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user = $sec->getUser();
        $unread = (int) $em->createQuery(
            'SELECT COUNT(n.id) FROM App\Entity\Notification n WHERE n.userId = :uid AND n.readAt IS NULL'
        )->setParameter('uid', $user->getId())->getSingleScalarResult();
        return $this->json(['unread' => $unread]);
    }

    // PATCH /api/notifications/{id}/read
    #[Route('/{id}/read', methods: ['PATCH', 'POST'])]
    public function markRead(string $id, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user  = $sec->getUser();
        $notif = $em->getRepository(Notification::class)->find($id);
        if (!$notif) return $this->json(['error' => 'Notification introuvable.'], 404);
        // Confidentialité stricte : uniquement ses propres notifications
        if ($notif->getUserId() !== $user->getId()) {
            return $this->json(['error' => 'Accès refusé.'], 403);
        }
        if (!$notif->isRead()) {
            $notif->markRead();
            $em->flush();
        }
        return $this->json(['read' => true]);
    }

    // POST /api/notifications/read-all
    #[Route('/read-all', methods: ['POST'])]
    public function markAllRead(EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user = $sec->getUser();
        $em->createQuery(
            'UPDATE App\Entity\Notification n SET n.readAt = :now
             WHERE n.userId = :uid AND n.readAt IS NULL'
        )->setParameter('now', new \DateTimeImmutable())
         ->setParameter('uid', $user->getId())
         ->execute();
        return $this->json(['read' => true]);
    }
}
