<?php
declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Commentaire INTERNE à l'organisation sur une candidature.
 * JAMAIS visible du candidat, sous aucune forme (spec).
 */
#[ORM\Entity]
#[ORM\Table(name: 'internal_comment')]
class InternalComment
{
    #[ORM\Id]
    #[ORM\Column(type: 'string', length: 36)]
    private string $id;

    #[ORM\Column(length: 36)] private string $applicationId;
    #[ORM\Column(length: 36)] private string $organizationId;
    #[ORM\Column(length: 36)] private string $authorId;
    #[ORM\Column(length: 2000)] private string $body;
    #[ORM\Column] private \DateTimeImmutable $createdAt;

    public function __construct(string $applicationId, string $organizationId, string $authorId, string $body)
    {
        $this->id             = Uuid::v4()->toRfc4122();
        $this->applicationId  = $applicationId;
        $this->organizationId = $organizationId;
        $this->authorId       = $authorId;
        $this->body           = mb_substr(strip_tags(trim($body)), 0, 2000);
        $this->createdAt      = new \DateTimeImmutable();
    }

    public function getId(): string { return $this->id; }
    public function getApplicationId(): string { return $this->applicationId; }
    public function getOrganizationId(): string { return $this->organizationId; }
    public function getAuthorId(): string { return $this->authorId; }
    public function getBody(): string { return $this->body; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
