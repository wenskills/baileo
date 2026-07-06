<?php
declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Lien de suivi pour le PROPRIÉTAIRE RÉEL du bien géré par une agence
 * (spec Wendy : transparence agence → propriétaire). Lecture seule,
 * compteurs et jalons UNIQUEMENT — jamais de données personnelles
 * des candidats (RGPD : minimisation).
 */
#[ORM\Entity]
#[ORM\Table(name: 'campaign_follow_link')]
class CampaignFollowLink
{
    #[ORM\Id]
    #[ORM\Column(type: 'string', length: 36)]
    private string $id;

    #[ORM\Column(length: 36)] private string $campaignId;
    #[ORM\Column(length: 120)] private string $ownerName;
    #[ORM\Column(length: 64, unique: true)] private string $token;
    #[ORM\Column(length: 20)] private string $status = 'active'; // active | revoked
    #[ORM\Column(length: 36)] private string $createdBy;
    #[ORM\Column] private \DateTimeImmutable $createdAt;

    public function __construct(string $campaignId, string $ownerName, string $createdBy)
    {
        $this->id         = Uuid::v4()->toRfc4122();
        $this->campaignId = $campaignId;
        $this->ownerName  = mb_substr(strip_tags(trim($ownerName)), 0, 120) ?: 'Propriétaire';
        $this->token      = bin2hex(random_bytes(32));
        $this->createdBy  = $createdBy;
        $this->createdAt  = new \DateTimeImmutable();
    }

    public function getId(): string { return $this->id; }
    public function getCampaignId(): string { return $this->campaignId; }
    public function getOwnerName(): string { return $this->ownerName; }
    public function getToken(): string { return $this->token; }
    public function getStatus(): string { return $this->status; }
    public function isActive(): bool { return $this->status === 'active'; }
    public function revoke(): void { $this->status = 'revoked'; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
