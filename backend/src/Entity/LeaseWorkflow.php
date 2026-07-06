<?php
declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Préparation du bail après acceptation (squelette Phase 2 —
 * la signature électronique complète viendra en Phase 2.5/3).
 * draft → ready → sent → owner_signed → candidate_signed → completed → archived
 */
#[ORM\Entity]
#[ORM\Table(name: 'lease_workflow')]
#[ORM\UniqueConstraint(name: 'uniq_lease_application', columns: ['application_id'])]
class LeaseWorkflow
{
    public const STATUSES = ['draft', 'ready', 'sent', 'owner_signed', 'candidate_signed', 'completed', 'archived'];

    #[ORM\Id]
    #[ORM\Column(type: 'string', length: 36)]
    private string $id;

    #[ORM\Column(length: 36)] private string $applicationId;
    #[ORM\Column(length: 20)] private string $status = 'draft';
    #[ORM\Column] private \DateTimeImmutable $createdAt;
    #[ORM\Column(nullable: true)] private ?\DateTimeImmutable $updatedAt = null;

    public function __construct(string $applicationId)
    {
        $this->id            = Uuid::v4()->toRfc4122();
        $this->applicationId = $applicationId;
        $this->createdAt     = new \DateTimeImmutable();
    }

    public function getId(): string { return $this->id; }
    public function getApplicationId(): string { return $this->applicationId; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $v): static
    {
        if (in_array($v, self::STATUSES, true)) { $this->status = $v; $this->updatedAt = new \DateTimeImmutable(); }
        return $this;
    }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): ?\DateTimeImmutable { return $this->updatedAt; }
}
