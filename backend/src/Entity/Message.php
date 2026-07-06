<?php
declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Message dans le cadre d'une candidature.
 * Chaque Application a son propre fil de discussion propriétaire ↔ candidat.
 *
 * Sécurité : seuls les participants de la candidature (candidateId + ownerId de la campagne)
 * peuvent lire et envoyer des messages.
 */
#[ORM\Entity]
#[ORM\Table(name: 'message')]
#[ORM\Index(columns: ['application_id'], name: 'idx_msg_application')]
#[ORM\Index(columns: ['sender_id'], name: 'idx_msg_sender')]
class Message
{
    #[ORM\Id]
    #[ORM\Column(type: 'string', length: 36)]
    private string $id;

    /** Lien vers la candidature (conversation) */
    /** Nullable : les messages de CONTACT (avant toute candidature) n'ont pas de candidature */
    #[ORM\Column(length: 36, nullable: true)]
    private ?string $applicationId = null;

    /** Fil de discussion : campagne + candidat (toujours renseignés désormais) */
    #[ORM\Column(length: 36, nullable: true)]
    private ?string $campaignId = null;

    #[ORM\Column(length: 36, nullable: true)]
    private ?string $candidateId = null;

    /** UUID de l'expéditeur */
    #[ORM\Column(length: 36)]
    private string $senderId;

    /** candidate | owner */
    #[ORM\Column(length: 20)]
    private string $senderRole;

    #[ORM\Column(type: 'text')]
    private string $content;

    /** Lecture par le destinataire */
    #[ORM\Column(options: ['default' => false])]
    private bool $read = false;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $readAt = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->id            = Uuid::v4()->toRfc4122();
        $this->createdAt     = new \DateTimeImmutable();
        $this->applicationId = ''; // Doit être remplacé avant persist
        $this->senderId      = ''; // Doit être remplacé avant persist
        $this->senderRole    = ''; // Doit être remplacé avant persist
        $this->content       = ''; // Doit être remplacé avant persist
    }

    public function getId(): string { return $this->id; }

    public function getApplicationId(): ?string { return $this->applicationId; }
    public function setApplicationId(?string $v): static { $this->applicationId = $v; return $this; }

    public function getCampaignId(): ?string { return $this->campaignId; }
    public function setCampaignId(?string $v): static { $this->campaignId = $v; return $this; }
    public function getCandidateId(): ?string { return $this->candidateId; }
    public function setCandidateId(?string $v): static { $this->candidateId = $v; return $this; }

    public function getSenderId(): string { return $this->senderId; }
    public function setSenderId(string $v): static { $this->senderId = $v; return $this; }

    public function getSenderRole(): string { return $this->senderRole; }
    public function setSenderRole(string $v): static { $this->senderRole = $v; return $this; }

    public function getContent(): string { return $this->content; }
    public function setContent(string $v): static { $this->content = trim($v); return $this; }

    public function isRead(): bool { return $this->read; }
    public function markRead(): void
    {
        $this->read   = true;
        $this->readAt = new \DateTimeImmutable();
    }

    public function getReadAt(): ?\DateTimeImmutable { return $this->readAt; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
