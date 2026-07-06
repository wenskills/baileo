<?php
declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Candidature d'un locataire à une campagne.
 *
 * Contrainte unique : un candidat ne peut postuler qu'une fois par campagne.
 *
 * Sécurité :
 *  - seul le candidat peut créer sa candidature
 *  - seul le propriétaire de la campagne ou le candidat peut lire les détails
 *  - seul le propriétaire peut changer le statut
 *  - le score n'est visible que du propriétaire (pas du candidat — RGPD algorithme)
 */
#[ORM\Entity]
#[ORM\Table(name: 'application')]
#[ORM\UniqueConstraint(name: 'uq_application_campaign_candidate', columns: ['campaign_id', 'candidate_id'])]
#[ORM\Index(columns: ['campaign_id'], name: 'idx_app_campaign')]
#[ORM\Index(columns: ['candidate_id'], name: 'idx_app_candidate')]
#[ORM\Index(columns: ['status'], name: 'idx_app_status')]
class Application
{
    #[ORM\Id]
    #[ORM\Column(type: 'string', length: 36)]
    private string $id;

    #[ORM\Column(length: 36)]
    private string $campaignId;

    #[ORM\Column(length: 36)]
    private string $candidateId;

    /**
     * Pipeline de qualification :
     * new → prequalification → documents → visite → decision → signature | refused | accepted
     */
    #[ORM\Column(length: 30, options: ['default' => 'new'])]
    private string $status = 'new';

    /** Score de compatibilité /100 — calculé par ScoringService */
    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $score = null;

    /** Détail du score par critère (JSON) — visible propriétaire uniquement */
    #[ORM\Column(type: 'json')]
    private array $scoreBreakdown = [];

    /** Note privée du propriétaire sur ce candidat */
    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $ownerNote = null;

    /** Tags posés par le propriétaire */
    #[ORM\Column(type: 'json')]
    private array $tags = [];

    /** Message d'introduction du candidat lors de sa candidature */
    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $coverLetter = null;

    /** Première consultation du dossier par le propriétaire (suivi transparent) */
    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $viewedAt = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $updatedAt = null;

    /** Timestamp du dernier mouvement de pipeline */
    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $statusChangedAt = null;

    public function __construct()
    {
        $this->id          = Uuid::v4()->toRfc4122();
        $this->createdAt   = new \DateTimeImmutable();
        $this->campaignId  = ''; // Doit être remplacé par setCampaignId() avant persist
        $this->candidateId = ''; // Doit être remplacé par setCandidateId() avant persist
    }

    // ── Getters / Setters ─────────────────────────────────────────────
    public function getId(): string { return $this->id; }

    public function getCampaignId(): string { return $this->campaignId; }
    public function setCampaignId(string $v): static { $this->campaignId = $v; return $this; }

    public function getCandidateId(): string { return $this->candidateId; }
    public function setCandidateId(string $v): static { $this->candidateId = $v; return $this; }

    public function getStatus(): string { return $this->status; }
    public function setStatus(string $v): static
    {
        $this->status          = $v;
        $this->statusChangedAt = new \DateTimeImmutable();
        $this->touch();
        return $this;
    }

    public function getScore(): ?int { return $this->score; }
    public function setScore(?int $v): static { $this->score = $v; return $this; }

    public function getScoreBreakdown(): array { return $this->scoreBreakdown; }
    public function setScoreBreakdown(array $v): static { $this->scoreBreakdown = $v; return $this; }

    public function getOwnerNote(): ?string { return $this->ownerNote; }
    public function setOwnerNote(?string $v): static { $this->ownerNote = $v; return $this; }

    public function getTags(): array { return $this->tags; }
    public function setTags(array $v): static { $this->tags = $v; return $this; }

    public function getCoverLetter(): ?string { return $this->coverLetter; }
    public function setCoverLetter(?string $v): static { $this->coverLetter = $v; return $this; }

    public function getViewedAt(): ?\DateTimeImmutable { return $this->viewedAt; }
    public function markViewed(): void { if ($this->viewedAt === null) $this->viewedAt = new \DateTimeImmutable(); }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): ?\DateTimeImmutable { return $this->updatedAt; }
    public function getStatusChangedAt(): ?\DateTimeImmutable { return $this->statusChangedAt; }
    public function touch(): void { $this->updatedAt = new \DateTimeImmutable(); }

    // ── Helpers ───────────────────────────────────────────────────────
    public function belongsToCandidate(string $userId): bool { return $this->candidateId === $userId; }
    public function isActive(): bool { return !in_array($this->status, ['refused', 'accepted']); }

    public static function validStatuses(): array
    {
        return ['new', 'prequalification', 'documents', 'visite', 'decision', 'signature', 'accepted', 'waitlist', 'refused', 'cancelled', 'withdrawn'];
    }
}
