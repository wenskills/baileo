<?php
declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Assignation d'une candidature à un membre (« qui traite quoi »).
 */
#[ORM\Entity]
#[ORM\Table(name: 'assignment')]
#[ORM\UniqueConstraint(name: 'uniq_assignment_application', columns: ['application_id'])]
class Assignment
{
    #[ORM\Id]
    #[ORM\Column(type: 'string', length: 36)]
    private string $id;

    #[ORM\Column(length: 36)] private string $applicationId;
    #[ORM\Column(length: 36)] private string $assignedToUserId;
    #[ORM\Column(length: 36)] private string $assignedByUserId;
    #[ORM\Column] private \DateTimeImmutable $createdAt;

    public function __construct(string $applicationId, string $to, string $by)
    {
        $this->id               = Uuid::v4()->toRfc4122();
        $this->applicationId    = $applicationId;
        $this->assignedToUserId = $to;
        $this->assignedByUserId = $by;
        $this->createdAt        = new \DateTimeImmutable();
    }

    public function getId(): string { return $this->id; }
    public function getApplicationId(): string { return $this->applicationId; }
    public function getAssignedToUserId(): string { return $this->assignedToUserId; }
    public function setAssignedToUserId(string $v): static { $this->assignedToUserId = $v; return $this; }
    public function getAssignedByUserId(): string { return $this->assignedByUserId; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
