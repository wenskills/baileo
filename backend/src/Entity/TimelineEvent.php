<?php
declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Événement de timeline d'une candidature — journal d'audit.
 *
 * Exigence de la spec : "Tous les changements de statut doivent être audités."
 * Chaque action significative (candidature créée, statut changé, visite réservée,
 * message envoyé, document ajouté) crée un TimelineEvent immuable.
 */
#[ORM\Entity]
#[ORM\Table(name: 'timeline_event')]
#[ORM\Index(columns: ['application_id'], name: 'idx_tl_application')]
#[ORM\Index(columns: ['created_at'], name: 'idx_tl_created')]
class TimelineEvent
{
    public const TYPES = [
        'application_created', 'status_changed', 'document_added',
        'visit_booked', 'visit_cancelled', 'message_sent',
        'application_accepted', 'application_rejected', 'note_updated',
    ];

    #[ORM\Id]
    #[ORM\Column(type: 'string', length: 36)]
    private string $id;

    #[ORM\Column(length: 36)]
    private string $applicationId;

    /** UUID de l'acteur — null pour les événements système */
    /** Qui peut voir cet événement : all | owner_only | candidate_visible | agency_internal */
    #[ORM\Column(length: 20, options: ['default' => 'all'])]
    private string $visibility = 'all';

    #[ORM\Column(length: 36, nullable: true)]
    private ?string $actorId = null;

    /** candidate | owner | system */
    #[ORM\Column(length: 20, options: ['default' => 'system'])]
    private string $actorRole = 'system';

    #[ORM\Column(length: 50)]
    private string $type;

    #[ORM\Column(length: 500)]
    private string $message;

    /** Ancienne valeur (ex: ancien statut) — pour l'audit */
    #[ORM\Column(length: 100, nullable: true)]
    private ?string $oldValue = null;

    /** Nouvelle valeur */
    #[ORM\Column(length: 100, nullable: true)]
    private ?string $newValue = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->id            = Uuid::v4()->toRfc4122();
        $this->createdAt     = new \DateTimeImmutable();
        $this->applicationId = '';
        $this->type          = '';
        $this->message       = '';
    }

    public function getId(): string { return $this->id; }
    public function getApplicationId(): string { return $this->applicationId; }
    public function setApplicationId(string $v): static { $this->applicationId = $v; return $this; }
    public function getVisibility(): string { return $this->visibility; }
    public function setVisibility(string $v): static
    {
        $this->visibility = in_array($v, ['all', 'owner_only', 'candidate_visible', 'agency_internal'], true) ? $v : 'all';
        return $this;
    }

    public function getActorId(): ?string { return $this->actorId; }
    public function setActorId(?string $v): static { $this->actorId = $v; return $this; }
    public function getActorRole(): string { return $this->actorRole; }
    public function setActorRole(string $v): static { $this->actorRole = $v; return $this; }
    public function getType(): string { return $this->type; }
    public function setType(string $v): static { $this->type = $v; return $this; }
    public function getMessage(): string { return $this->message; }
    public function setMessage(string $v): static { $this->message = mb_substr(strip_tags(trim($v)), 0, 500); return $this; }
    public function getOldValue(): ?string { return $this->oldValue; }
    public function setOldValue(?string $v): static { $this->oldValue = $v; return $this; }
    public function getNewValue(): ?string { return $this->newValue; }
    public function setNewValue(?string $v): static { $this->newValue = $v; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
