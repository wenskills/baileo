<?php
declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Invitation à rejoindre une organisation — token unique, expiration 7 jours.
 */
#[ORM\Entity]
#[ORM\Table(name: 'organization_invitation')]
class OrganizationInvitation
{
    #[ORM\Id]
    #[ORM\Column(type: 'string', length: 36)]
    private string $id;

    #[ORM\Column(length: 36)]  private string $organizationId;
    #[ORM\Column(length: 180)] private string $email;
    #[ORM\Column(length: 20)]  private string $role;
    #[ORM\Column(length: 64, unique: true)] private string $token;
    #[ORM\Column(length: 36)]  private string $createdBy;
    #[ORM\Column] private \DateTimeImmutable $expiresAt;
    #[ORM\Column(nullable: true)] private ?\DateTimeImmutable $acceptedAt = null;
    #[ORM\Column] private \DateTimeImmutable $createdAt;

    public function __construct(string $organizationId, string $email, string $role, string $createdBy)
    {
        $this->id             = Uuid::v4()->toRfc4122();
        $this->organizationId = $organizationId;
        $this->email          = mb_strtolower(trim($email));
        $this->role           = in_array($role, OrganizationMember::ROLES, true) ? $role : 'agent';
        $this->token          = bin2hex(random_bytes(32));
        $this->createdBy      = $createdBy;
        $this->createdAt      = new \DateTimeImmutable();
        $this->expiresAt      = new \DateTimeImmutable('+7 days');
    }

    public function getId(): string { return $this->id; }
    public function getOrganizationId(): string { return $this->organizationId; }
    public function getEmail(): string { return $this->email; }
    public function getRole(): string { return $this->role; }
    public function getToken(): string { return $this->token; }
    public function getExpiresAt(): \DateTimeImmutable { return $this->expiresAt; }
    public function isExpired(): bool { return $this->expiresAt < new \DateTimeImmutable(); }
    public function getAcceptedAt(): ?\DateTimeImmutable { return $this->acceptedAt; }
    public function accept(): void { $this->acceptedAt = new \DateTimeImmutable(); }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
