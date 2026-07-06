<?php
declare(strict_types=1);

namespace App\Service;

use App\Entity\Notification;
use App\Entity\TimelineEvent;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Service transverse : journal d'audit (TimelineEvent) + notifications in-app.
 *
 * Centralise la traçabilité exigée par la spec :
 * "Tous les changements de statut doivent être audités."
 * Chaque action métier appelle log() et/ou notify() — jamais de flush ici,
 * le flush est fait par le controller appelant (transaction unique).
 */
final class ActivityService
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    /**
     * Enregistre un événement d'audit sur une candidature.
     */
    public function log(
        string $applicationId,
        string $type,
        string $message,
        ?string $actorId = null,
        string $actorRole = 'system',
        ?string $oldValue = null,
        ?string $newValue = null,
        string $visibility = 'all',
    ): TimelineEvent {
        $event = new TimelineEvent();
        $event->setApplicationId($applicationId)
              ->setType($type)
              ->setMessage($message)
              ->setActorId($actorId)
              ->setActorRole($actorRole)
              ->setOldValue($oldValue)
              ->setNewValue($newValue);
        $event->setVisibility($visibility);
        $this->em->persist($event);
        return $event;
    }

    /**
     * Crée une notification in-app pour un utilisateur.
     */
    public function notify(
        string $userId,
        string $type,
        string $title,
        string $body,
        ?string $link = null,
    ): Notification {
        $notif = new Notification();
        $notif->setUserId($userId)
              ->setType($type)
              ->setTitle($title)
              ->setBody($body)
              ->setLink($link);
        $this->em->persist($notif);
        return $notif;
    }
}
