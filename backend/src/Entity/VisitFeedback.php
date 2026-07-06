<?php
declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Fiche ressenti après visite — STRICTEMENT PRIVÉE au propriétaire (spec Phase 2).
 * « Cette fiche est privée. [...] Jamais les notes privées » au candidat.
 * Le retour éventuel au candidat passe par un message CHOISI, jamais par cette fiche.
 */
#[ORM\Entity]
#[ORM\Table(name: 'visit_feedback')]
#[ORM\UniqueConstraint(name: 'uniq_vf_application', columns: ['application_id'])]
class VisitFeedback
{
    #[ORM\Id]
    #[ORM\Column(type: 'string', length: 36)]
    private string $id;

    #[ORM\Column(length: 36)]
    private string $applicationId;

    /** Notes 1–5 (null = non renseigné) */
    #[ORM\Column(type: 'smallint', nullable: true)] private ?int $punctuality = null;
    #[ORM\Column(type: 'smallint', nullable: true)] private ?int $presentation = null;
    #[ORM\Column(type: 'smallint', nullable: true)] private ?int $communication = null;
    #[ORM\Column(type: 'smallint', nullable: true)] private ?int $interest = null;
    #[ORM\Column(type: 'smallint', nullable: true)] private ?int $compatibility = null;

    #[ORM\Column(length: 1000, nullable: true)] private ?string $positives = null;
    #[ORM\Column(length: 1000, nullable: true)] private ?string $negatives = null;
    #[ORM\Column(length: 2000, nullable: true)] private ?string $comment = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $updatedAt = null;

    public function __construct()
    {
        $this->id            = Uuid::v4()->toRfc4122();
        $this->createdAt     = new \DateTimeImmutable();
        $this->applicationId = '';
    }

    private function clampNote(?int $v): ?int
    {
        return ($v !== null && $v >= 1 && $v <= 5) ? $v : null;
    }
    private function cleanText(?string $v, int $max): ?string
    {
        $t = $v !== null ? mb_substr(strip_tags(trim($v)), 0, $max) : null;
        return $t !== '' ? $t : null;
    }

    public function getId(): string { return $this->id; }
    public function getApplicationId(): string { return $this->applicationId; }
    public function setApplicationId(string $v): static { $this->applicationId = $v; return $this; }

    public function getPunctuality(): ?int { return $this->punctuality; }
    public function setPunctuality(?int $v): static { $this->punctuality = $this->clampNote($v); return $this; }
    public function getPresentation(): ?int { return $this->presentation; }
    public function setPresentation(?int $v): static { $this->presentation = $this->clampNote($v); return $this; }
    public function getCommunication(): ?int { return $this->communication; }
    public function setCommunication(?int $v): static { $this->communication = $this->clampNote($v); return $this; }
    public function getInterest(): ?int { return $this->interest; }
    public function setInterest(?int $v): static { $this->interest = $this->clampNote($v); return $this; }
    public function getCompatibility(): ?int { return $this->compatibility; }
    public function setCompatibility(?int $v): static { $this->compatibility = $this->clampNote($v); return $this; }

    public function getPositives(): ?string { return $this->positives; }
    public function setPositives(?string $v): static { $this->positives = $this->cleanText($v, 1000); return $this; }
    public function getNegatives(): ?string { return $this->negatives; }
    public function setNegatives(?string $v): static { $this->negatives = $this->cleanText($v, 1000); return $this; }
    public function getComment(): ?string { return $this->comment; }
    public function setComment(?string $v): static { $this->comment = $this->cleanText($v, 2000); return $this; }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): ?\DateTimeImmutable { return $this->updatedAt; }
    public function touch(): void { $this->updatedAt = new \DateTimeImmutable(); }
}
