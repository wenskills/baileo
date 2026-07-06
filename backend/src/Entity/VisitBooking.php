<?php
declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Réservation d'un créneau de visite par un candidat.
 *
 * Règles (spec module 11) :
 *  - une candidature ne peut pas avoir deux réservations actives sur la même campagne
 *  - réservation impossible sans candidature existante
 *  - annulation possible par le candidat ou le propriétaire
 */
#[ORM\Entity]
#[ORM\Table(name: 'visit_booking')]
#[ORM\Index(columns: ['slot_id'], name: 'idx_vb_slot')]
#[ORM\Index(columns: ['application_id'], name: 'idx_vb_application')]
#[ORM\Index(columns: ['candidate_id'], name: 'idx_vb_candidate')]
class VisitBooking
{
    #[ORM\Id]
    #[ORM\Column(type: 'string', length: 36)]
    private string $id;

    #[ORM\Column(length: 36)]
    private string $slotId;

    #[ORM\Column(length: 36)]
    private string $applicationId;

    #[ORM\Column(length: 36)]
    private string $candidateId;

    /** booked | cancelled */
    #[ORM\Column(length: 20, options: ['default' => 'booked'])]
    private string $status = 'booked';

    #[ORM\Column]
    private \DateTimeImmutable $bookedAt;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $cancelledAt = null;

    public function __construct()
    {
        $this->id            = Uuid::v4()->toRfc4122();
        $this->bookedAt      = new \DateTimeImmutable();
        $this->slotId        = '';
        $this->applicationId = '';
        $this->candidateId   = '';
    }

    public function getId(): string { return $this->id; }
    public function getSlotId(): string { return $this->slotId; }
    public function setSlotId(string $v): static { $this->slotId = $v; return $this; }
    public function getApplicationId(): string { return $this->applicationId; }
    public function setApplicationId(string $v): static { $this->applicationId = $v; return $this; }
    public function getCandidateId(): string { return $this->candidateId; }
    public function setCandidateId(string $v): static { $this->candidateId = $v; return $this; }
    public function getStatus(): string { return $this->status; }
    /** Réservation vivante (occupe une place) : réservée ou confirmée. */
    public function isActive(): bool { return in_array($this->status, ['booked', 'confirmed'], true); }
    public function setStatus(string $v): static
    {
        if (in_array($v, ['booked', 'confirmed', 'completed', 'cancelled', 'no_show'], true)) $this->status = $v;
        return $this;
    }
    public function cancel(): void
    {
        $this->status      = 'cancelled';
        $this->cancelledAt = new \DateTimeImmutable();
    }
    public function getBookedAt(): \DateTimeImmutable { return $this->bookedAt; }
    public function getCancelledAt(): ?\DateTimeImmutable { return $this->cancelledAt; }
}
