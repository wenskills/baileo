<?php
declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Décision formelle sur une candidature.
 * Le candidat reçoit UNIQUEMENT candidateMessage — internalReason
 * reste privée (jamais exposée, jamais opposable).
 */
#[ORM\Entity]
#[ORM\Table(name: 'decision')]
#[ORM\UniqueConstraint(name: 'uniq_decision_application', columns: ['application_id'])]
class Decision
{
    #[ORM\Id]
    #[ORM\Column(type: 'string', length: 36)]
    private string $id;

    #[ORM\Column(length: 36)] private string $applicationId;
    #[ORM\Column(length: 36)] private string $decidedBy;

    /** accepted | rejected | waitlisted | cancelled */
    #[ORM\Column(length: 20)] private string $decision;

    /** Le message que le candidat REÇOIT (choisi, neutre) */
    #[ORM\Column(length: 2000, nullable: true)] private ?string $candidateMessage = null;

    /** PRIVÉ : raison interne, jamais exposée au candidat */
    #[ORM\Column(length: 2000, nullable: true)] private ?string $internalReason = null;

    #[ORM\Column] private \DateTimeImmutable $createdAt;

    public function __construct(string $applicationId, string $decidedBy, string $decision)
    {
        $this->id            = Uuid::v4()->toRfc4122();
        $this->applicationId = $applicationId;
        $this->decidedBy     = $decidedBy;
        $this->decision      = in_array($decision, ['accepted','rejected','waitlisted','cancelled'], true) ? $decision : 'rejected';
        $this->createdAt     = new \DateTimeImmutable();
    }

    private function clean(?string $v, int $max): ?string
    {
        $t = $v !== null ? mb_substr(strip_tags(trim($v)), 0, $max) : null;
        return $t !== '' ? $t : null;
    }

    public function getId(): string { return $this->id; }
    public function getApplicationId(): string { return $this->applicationId; }
    public function getDecidedBy(): string { return $this->decidedBy; }
    public function getDecision(): string { return $this->decision; }
    public function getCandidateMessage(): ?string { return $this->candidateMessage; }
    public function setCandidateMessage(?string $v): static { $this->candidateMessage = $this->clean($v, 2000); return $this; }
    public function getInternalReason(): ?string { return $this->internalReason; }
    public function setInternalReason(?string $v): static { $this->internalReason = $this->clean($v, 2000); return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
