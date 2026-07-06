<?php
declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Journal d'audit des actions sensibles (spec : « toutes les actions
 * sont historisées »). Aucune donnée personnelle sensible dans les valeurs.
 */
#[ORM\Entity]
#[ORM\Table(name: 'audit_log')]
#[ORM\Index(name: 'idx_audit_resource', columns: ['resource_type', 'resource_id'])]
#[ORM\Index(name: 'idx_audit_org', columns: ['organization_id'])]
class AuditLog
{
    #[ORM\Id]
    #[ORM\Column(type: 'string', length: 36)]
    private string $id;

    #[ORM\Column(length: 36, nullable: true)] private ?string $actorId = null;
    #[ORM\Column(length: 36, nullable: true)] private ?string $organizationId = null;
    #[ORM\Column(length: 50)] private string $resourceType;
    #[ORM\Column(length: 36)] private string $resourceId;
    #[ORM\Column(length: 60)] private string $action;
    #[ORM\Column(length: 300, nullable: true)] private ?string $oldValue = null;
    #[ORM\Column(length: 300, nullable: true)] private ?string $newValue = null;
    #[ORM\Column] private \DateTimeImmutable $createdAt;

    public function __construct(string $resourceType, string $resourceId, string $action,
                                ?string $actorId = null, ?string $organizationId = null,
                                ?string $old = null, ?string $new = null)
    {
        $this->id             = Uuid::v4()->toRfc4122();
        $this->resourceType   = mb_substr($resourceType, 0, 50);
        $this->resourceId     = $resourceId;
        $this->action         = mb_substr($action, 0, 60);
        $this->actorId        = $actorId;
        $this->organizationId = $organizationId;
        $this->oldValue       = $old !== null ? mb_substr($old, 0, 300) : null;
        $this->newValue       = $new !== null ? mb_substr($new, 0, 300) : null;
        $this->createdAt      = new \DateTimeImmutable();
    }

    public function getId(): string { return $this->id; }
    public function getActorId(): ?string { return $this->actorId; }
    public function getResourceType(): string { return $this->resourceType; }
    public function getResourceId(): string { return $this->resourceId; }
    public function getAction(): string { return $this->action; }
    public function getOldValue(): ?string { return $this->oldValue; }
    public function getNewValue(): ?string { return $this->newValue; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
