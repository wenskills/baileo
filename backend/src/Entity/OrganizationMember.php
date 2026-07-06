<?php
declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Membre d'une organisation (agence). Le rôle VIVANT est ici —
 * ROLE_AGENCY sur User n'est qu'un marqueur legacy.
 * admin > manager > agent > viewer (permissions serveur : OrganizationPermissionService).
 */
#[ORM\Entity]
#[ORM\Table(name: 'organization_member')]
#[ORM\UniqueConstraint(name: 'uniq_member_org_user', columns: ['organization_id', 'user_id'])]
class OrganizationMember
{
    public const ROLES = ['admin', 'manager', 'agent', 'viewer'];

    #[ORM\Id]
    #[ORM\Column(type: 'string', length: 36)]
    private string $id;

    #[ORM\Column(length: 36)] private string $organizationId;
    #[ORM\Column(length: 36)] private string $userId;
    #[ORM\Column(length: 20)] private string $role = 'agent';
    #[ORM\Column(length: 20)] private string $status = 'active'; // invited | active | suspended
    #[ORM\Column] private \DateTimeImmutable $createdAt;
    #[ORM\Column(nullable: true)] private ?\DateTimeImmutable $joinedAt = null;

    public function __construct(string $organizationId, string $userId, string $role = 'agent')
    {
        $this->id             = Uuid::v4()->toRfc4122();
        $this->organizationId = $organizationId;
        $this->userId         = $userId;
        $this->setRole($role);
        $this->createdAt      = new \DateTimeImmutable();
        $this->joinedAt       = new \DateTimeImmutable();
    }

    public function getId(): string { return $this->id; }
    public function getOrganizationId(): string { return $this->organizationId; }
    public function getUserId(): string { return $this->userId; }
    public function getRole(): string { return $this->role; }
    public function setRole(string $r): static { if (in_array($r, self::ROLES, true)) $this->role = $r; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $s): static { if (in_array($s, ['invited','active','suspended'], true)) $this->status = $s; return $this; }
    public function isActive(): bool { return $this->status === 'active'; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getJoinedAt(): ?\DateTimeImmutable { return $this->joinedAt; }
}
