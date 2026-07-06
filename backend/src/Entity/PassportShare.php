<?php
declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Partage du Rental Passport avec un propriétaire, dans le cadre d'une
 * candidature. Le candidat VOIT et CONTRÔLE ses partages (RGPD : consentement).
 * Révoqué automatiquement au retrait de la candidature.
 */
#[ORM\Entity]
#[ORM\Table(name: 'passport_share')]
#[ORM\UniqueConstraint(name: 'uniq_share_application', columns: ['application_id'])]
class PassportShare
{
    #[ORM\Id]
    #[ORM\Column(type: 'string', length: 36)]
    private string $id;

    #[ORM\Column(length: 36)] private string $candidateId;
    #[ORM\Column(length: 36)] private string $applicationId;
    #[ORM\Column(length: 36)] private string $campaignId;
    #[ORM\Column(length: 36)] private string $ownerId;

    #[ORM\Column(length: 20)] private string $status = 'active'; // active | revoked

    #[ORM\Column] private \DateTimeImmutable $sharedAt;
    #[ORM\Column(nullable: true)] private ?\DateTimeImmutable $revokedAt = null;

    public function __construct(string $candidateId, string $applicationId, string $campaignId, string $ownerId)
    {
        $this->id            = Uuid::v4()->toRfc4122();
        $this->candidateId   = $candidateId;
        $this->applicationId = $applicationId;
        $this->campaignId    = $campaignId;
        $this->ownerId       = $ownerId;
        $this->sharedAt      = new \DateTimeImmutable();
    }

    public function getId(): string { return $this->id; }
    public function getCandidateId(): string { return $this->candidateId; }
    public function getApplicationId(): string { return $this->applicationId; }
    public function getCampaignId(): string { return $this->campaignId; }
    public function getOwnerId(): string { return $this->ownerId; }
    public function getStatus(): string { return $this->status; }
    public function isActive(): bool { return $this->status === 'active'; }
    public function revoke(): void { $this->status = 'revoked'; $this->revokedAt = new \DateTimeImmutable(); }
    public function getSharedAt(): \DateTimeImmutable { return $this->sharedAt; }
    public function getRevokedAt(): ?\DateTimeImmutable { return $this->revokedAt; }
}
