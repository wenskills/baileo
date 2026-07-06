<?php
declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Créneau de visite créé par le propriétaire d'une campagne.
 *
 * Règles métier (spec module 11) :
 *  - capacité limitée, bookedCount incrémenté à chaque réservation
 *  - impossible de réserver un slot complet ou passé
 *  - seul le propriétaire de la campagne peut créer/fermer un créneau
 */
#[ORM\Entity]
#[ORM\Table(name: 'visit_slot')]
#[ORM\Index(columns: ['campaign_id'], name: 'idx_vs_campaign')]
#[ORM\Index(columns: ['starts_at'], name: 'idx_vs_starts')]
class VisitSlot
{
    #[ORM\Id]
    #[ORM\Column(type: 'string', length: 36)]
    private string $id;

    #[ORM\Column(length: 36)]
    private string $campaignId;

    #[ORM\Column]
    private \DateTimeImmutable $startsAt;

    #[ORM\Column]
    private \DateTimeImmutable $endsAt;

    #[ORM\Column(type: 'integer', options: ['default' => 1])]
    private int $capacity = 1;

    #[ORM\Column(type: 'integer', options: ['default' => 0])]
    private int $bookedCount = 0;

    /** open | closed | cancelled */
    #[ORM\Column(length: 20, options: ['default' => 'open'])]
    private string $status = 'open';

    /** Infos pratiques (interphone, étage...) — jamais exposé publiquement sans candidature */
    #[ORM\Column(length: 500, nullable: true)]
    private ?string $location = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->id         = Uuid::v4()->toRfc4122();
        $this->createdAt  = new \DateTimeImmutable();
        $this->campaignId = ''; // Doit être remplacé avant persist
        $this->startsAt   = new \DateTimeImmutable();
        $this->endsAt     = new \DateTimeImmutable();
    }

    public function getId(): string { return $this->id; }
    public function getCampaignId(): string { return $this->campaignId; }
    public function setCampaignId(string $v): static { $this->campaignId = $v; return $this; }
    public function getStartsAt(): \DateTimeImmutable { return $this->startsAt; }
    public function setStartsAt(\DateTimeImmutable $v): static { $this->startsAt = $v; return $this; }
    public function getEndsAt(): \DateTimeImmutable { return $this->endsAt; }
    public function setEndsAt(\DateTimeImmutable $v): static { $this->endsAt = $v; return $this; }
    public function getCapacity(): int { return $this->capacity; }
    public function setCapacity(int $v): static { $this->capacity = max(1, min(50, $v)); return $this; }
    public function getBookedCount(): int { return $this->bookedCount; }
    public function incrementBooked(): void { $this->bookedCount++; }
    public function decrementBooked(): void { $this->bookedCount = max(0, $this->bookedCount - 1); }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $v): static { $this->status = $v; return $this; }
    public function getLocation(): ?string { return $this->location; }
    public function setLocation(?string $v): static { $this->location = $v ? mb_substr(trim($v), 0, 500) : null; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }

    public function isFull(): bool { return $this->bookedCount >= $this->capacity; }
    public function isPast(): bool { return $this->startsAt < new \DateTimeImmutable(); }
    public function isBookable(): bool { return $this->status === 'open' && !$this->isFull() && !$this->isPast(); }
}
