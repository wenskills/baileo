<?php
declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Dossier locatif (Rental Passport) d'un candidat.
 *
 * RGPD :
 *  - Ce document contient des données personnelles sensibles (revenus, documents).
 *  - Il est propriété exclusive du candidat (userId).
 *  - Les propriétaires ne peuvent le consulter QUE si le candidat a soumis
 *    une candidature à l'une de leurs campagnes (contrôlé dans ApplicationController).
 *  - Le candidat peut demander la suppression → DELETE /api/rental-passport.
 *  - Durée de conservation : 24 mois après la dernière candidature active.
 */
#[ORM\Entity]
#[ORM\Table(name: 'rental_passport')]
#[ORM\Index(columns: ['user_id'], name: 'idx_rp_user')]
class RentalPassport
{
    #[ORM\Id]
    #[ORM\Column(type: 'string', length: 36)]
    private string $id;

    #[ORM\Column(length: 36, unique: true)]
    private string $userId;

    // ── Identité ─────────────────────────────────────────────────────
    #[ORM\Column(length: 100, options: ['default' => ''])]
    private string $firstName = '';

    #[ORM\Column(length: 100, options: ['default' => ''])]
    private string $lastName = '';

    #[ORM\Column(length: 30, nullable: true)]
    private ?string $birthDate = null; // YYYY-MM-DD

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $nationality = null;

    #[ORM\Column(length: 30, nullable: true)]
    private ?string $phone = null;

    #[ORM\Column(length: 500, nullable: true)]
    private ?string $currentAddress = null;

    // ── Situation professionnelle ─────────────────────────────────────
    /** cdi | cdd | freelance | student | retired | unemployed */
    #[ORM\Column(length: 30, options: ['default' => ''])]
    private string $contractType = '';

    #[ORM\Column(length: 255, options: ['default' => ''])]
    private string $employer = '';

    #[ORM\Column(type: 'float', nullable: true)]
    private ?float $monthlyIncome = null;

    #[ORM\Column(length: 50, options: ['default' => ''])]
    private string $employmentDuration = ''; // ex: "2 ans 3 mois"

    // ── Garant ───────────────────────────────────────────────────────
    /** none | parent | spouse | other */
    #[ORM\Column(length: 30, options: ['default' => 'none'])]
    private string $guarantorRelation = 'none';

    #[ORM\Column(length: 255, options: ['default' => ''])]
    private string $guarantorName = '';

    #[ORM\Column(type: 'float', nullable: true)]
    private ?float $guarantorIncome = null;

    // ── Préférences locatives ─────────────────────────────────────────
    #[ORM\Column(type: 'float', nullable: true)]
    private ?float $maxRent = null;

    #[ORM\Column(type: 'float', nullable: true)]
    private ?float $minSurface = null;

    #[ORM\Column(length: 500, nullable: true)]
    private ?string $preferredCity = null;

    #[ORM\Column(length: 30, nullable: true)]
    private ?string $availabilityDate = null; // YYYY-MM-DD

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $projectDuration = null; // ex: "long_term" | "short_term"

    // ── Documents ────────────────────────────────────────────────────
    /**
     * JSON array of {type, name, uploadedAt, verified, size}
     * Types: identity | domicile | contract | payslips | tax | rib | insurance | guarantor_id | guarantor_income
     */
    #[ORM\Column(type: 'json')]
    private array $documents = [];

    // ── Métriques ────────────────────────────────────────────────────
    /** 0-100 : taux de complétion du dossier */
    #[ORM\Column(type: 'integer', options: ['default' => 0])]
    private int $completionRate = 0;

    /** Score calculé dynamiquement — mis à jour à chaque modification */
    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $cachedScore = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $updatedAt = null;

    /** Visibilité : le candidat peut choisir de rendre son passport visible aux propriétaires */
    #[ORM\Column(options: ['default' => true])]
    private bool $visibleToOwners = true;

    public function __construct()
    {
        $this->id        = Uuid::v4()->toRfc4122();
        $this->createdAt = new \DateTimeImmutable();
        $this->userId    = ''; // Doit être remplacé par setUserId() avant persist
    }

    // ── Getters / Setters ─────────────────────────────────────────────
    public function getId(): string { return $this->id; }
    public function getUserId(): string { return $this->userId; }
    public function setUserId(string $v): static { $this->userId = $v; return $this; }

    public function getFirstName(): string { return $this->firstName; }
    public function setFirstName(string $v): static { $this->firstName = trim($v); return $this; }
    public function getLastName(): string { return $this->lastName; }
    public function setLastName(string $v): static { $this->lastName = trim($v); return $this; }
    public function getBirthDate(): ?string { return $this->birthDate; }
    public function setBirthDate(?string $v): static { $this->birthDate = $v; return $this; }
    public function getNationality(): ?string { return $this->nationality; }
    public function setNationality(?string $v): static { $this->nationality = $v; return $this; }
    public function getPhone(): ?string { return $this->phone; }
    public function setPhone(?string $v): static { $this->phone = $v; return $this; }
    public function getCurrentAddress(): ?string { return $this->currentAddress; }
    public function setCurrentAddress(?string $v): static { $this->currentAddress = $v; return $this; }

    public function getContractType(): string { return $this->contractType; }
    public function setContractType(string $v): static { $this->contractType = $v; return $this; }
    public function getEmployer(): string { return $this->employer; }
    public function setEmployer(string $v): static { $this->employer = trim($v); return $this; }
    public function getMonthlyIncome(): ?float { return $this->monthlyIncome; }
    public function setMonthlyIncome(?float $v): static { $this->monthlyIncome = $v; return $this; }
    public function getEmploymentDuration(): string { return $this->employmentDuration; }
    public function setEmploymentDuration(string $v): static { $this->employmentDuration = $v; return $this; }

    public function getGuarantorRelation(): string { return $this->guarantorRelation; }
    public function setGuarantorRelation(string $v): static { $this->guarantorRelation = $v; return $this; }
    public function getGuarantorName(): string { return $this->guarantorName; }
    public function setGuarantorName(string $v): static { $this->guarantorName = trim($v); return $this; }
    public function getGuarantorIncome(): ?float { return $this->guarantorIncome; }
    public function setGuarantorIncome(?float $v): static { $this->guarantorIncome = $v; return $this; }

    public function getMaxRent(): ?float { return $this->maxRent; }
    public function setMaxRent(?float $v): static { $this->maxRent = $v; return $this; }
    public function getMinSurface(): ?float { return $this->minSurface; }
    public function setMinSurface(?float $v): static { $this->minSurface = $v; return $this; }
    public function getPreferredCity(): ?string { return $this->preferredCity; }
    public function setPreferredCity(?string $v): static { $this->preferredCity = $v; return $this; }
    public function getAvailabilityDate(): ?string { return $this->availabilityDate; }
    public function setAvailabilityDate(?string $v): static { $this->availabilityDate = $v; return $this; }
    public function getProjectDuration(): ?string { return $this->projectDuration; }
    public function setProjectDuration(?string $v): static { $this->projectDuration = $v; return $this; }

    public function getDocuments(): array { return $this->documents; }
    public function setDocuments(array $v): static { $this->documents = $v; return $this; }

    public function getCompletionRate(): int { return $this->completionRate; }
    public function setCompletionRate(int $v): static { $this->completionRate = max(0, min(100, $v)); return $this; }
    public function getCachedScore(): ?int { return $this->cachedScore; }
    public function setCachedScore(?int $v): static { $this->cachedScore = $v; return $this; }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): ?\DateTimeImmutable { return $this->updatedAt; }
    public function touch(): void { $this->updatedAt = new \DateTimeImmutable(); }

    public function isVisibleToOwners(): bool { return $this->visibleToOwners; }
    public function setVisibleToOwners(bool $v): static { $this->visibleToOwners = $v; return $this; }

    public function isOwnedBy(string $userId): bool { return $this->userId === $userId; }

    /**
     * Recalcule le taux de complétion basé sur les champs remplis.
     * Appelé automatiquement à chaque mise à jour.
     */
    public function recalculateCompletion(): void
    {
        // IMPORTANT : ne jamais utiliser [bool => int] comme array en PHP.
        // Les clés booléennes se convertissent en 0/1 et s'écrasent mutuellement.
        // On additionne directement avec l'opérateur ternaire.
        $total = 0;
        $total += !empty($this->firstName)                                     ?  10 : 0;
        $total += !empty($this->lastName)                                      ?   5 : 0;
        $total += !empty($this->birthDate)                                     ?   5 : 0;
        $total += !empty($this->phone)                                         ?   5 : 0;
        $total += !empty($this->contractType)                                  ?  10 : 0;
        $total += !empty($this->employer)                                      ?   5 : 0;
        $total += $this->monthlyIncome !== null                                ?  10 : 0;
        $total += !empty($this->availabilityDate)                              ?   5 : 0;
        $total += !empty($this->preferredCity)                                 ?   5 : 0;
        $total += count($this->documents) >= 3                                 ?  20 : 0;
        $total += count($this->documents) >= 6                                 ?  10 : 0; // bonus dossier complet
        $total += ($this->guarantorRelation !== 'none' && ($this->guarantorIncome ?? 0) > 0) ? 10 : 0;

        $this->completionRate = min(100, $total);
    }
}
