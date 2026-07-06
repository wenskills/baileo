<?php
declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Campagne de location créée par un propriétaire ou une agence.
 * Contient toutes les informations du bien, les conditions et le statut de publication.
 */
#[ORM\Entity]
#[ORM\Table(name: 'campaign')]
#[ORM\Index(columns: ['owner_id'], name: 'idx_campaign_owner')]
#[ORM\Index(columns: ['status'], name: 'idx_campaign_status')]
class Campaign
{
    #[ORM\Id]
    #[ORM\Column(type: 'string', length: 36)]
    private string $id;

    /** UUID de l'utilisateur propriétaire — JAMAIS exposé au candidat */
    #[ORM\Column(length: 36)]
    private string $ownerId;

    #[ORM\Column(length: 36, nullable: true)]
    private ?string $organizationId = null;

    // ── Informations générales ────────────────────────────────────────
    #[ORM\Column(length: 255)]
    private string $title;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $subtitle = null;

    /** apartment | house | colocation | studio | bureau | commerce */
    #[ORM\Column(length: 50, options: ['default' => 'apartment'])]
    private string $propertyType = 'apartment';

    #[ORM\Column(length: 500)]
    private string $address;

    #[ORM\Column(type: 'float', nullable: true)]
    private ?float $surface = null;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $rooms = null;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $bedrooms = null;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $bathrooms = null;


    // ── Conditions financières ────────────────────────────────────────
    #[ORM\Column(type: 'float')]
    private float $rent;

    #[ORM\Column(type: 'float', options: ['default' => 0])]
    private float $charges = 0;

    #[ORM\Column(type: 'float', options: ['default' => 0])]
    private float $deposit = 0;

    /** empty | furnished | colocation */
    #[ORM\Column(length: 30, options: ['default' => 'empty'])]
    private string $rentalType = 'empty';

    #[ORM\Column(type: 'integer', options: ['default' => 12])]
    private int $minDuration = 12; // mois

    // ── Descriptif ───────────────────────────────────────────────────
    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $description = null;

    /** JSON : ['elevator', 'parking', 'balcony', 'fiber', 'dishwasher', ...] */
    #[ORM\Column(type: 'json')]
    private array $amenities = [];

    /** JSON : ['url1', 'url2', ...] — URLs relatives dans /uploads */
    #[ORM\Column(type: 'json')]
    private array $photos = [];

    /** JSON : ['identity', 'payslips', 'contract', 'tax', 'guarantor', ...] */
    #[ORM\Column(type: 'json')]
    private array $documentsRequired = [];

    // ── Disponibilité ─────────────────────────────────────────────────
    #[ORM\Column(type: 'date_immutable', nullable: true)]
    private ?\DateTimeImmutable $availableAt = null;

    /** Diagnostic de performance énergétique A→G */
    #[ORM\Column(length: 1, nullable: true)]
    private ?string $dpe = null;

    /** Émissions de gaz à effet de serre A→G */
    #[ORM\Column(length: 1, nullable: true)]
    private ?string $ges = null;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $floor = null;

    #[ORM\Column(options: ['default' => false])]
    private bool $hasElevator = false;

    /** individuel_gaz | individuel_electrique | collectif | pompe_chaleur | autre */
    #[ORM\Column(length: 40, nullable: true)]
    private ?string $heatingType = null;

    /** Indications libres du propriétaire : [{label, value}] */
    #[ORM\Column(type: 'json', options: ['default' => '[]'])]
    private array $extras = [];

    /** Slug public unique généré à la publication — utilisé par /annonces/{slug} */
    #[ORM\Column(length: 300, nullable: true, unique: true)]
    private ?string $slug = null;

    /** RGPD : si false, l'adresse exacte est masquée sur la landing publique */
    #[ORM\Column(options: ['default' => true])]
    private bool $preciseAddressVisible = true;

    // ── Statut ───────────────────────────────────────────────────────
    /** draft | active | paused | closed */
    #[ORM\Column(length: 20, options: ['default' => 'draft'])]
    private string $status = 'draft';

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $publishedAt = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $updatedAt = null;

    public function __construct()
    {
        $this->id        = Uuid::v4()->toRfc4122();
        $this->createdAt = new \DateTimeImmutable();
        // Valeurs par défaut pour les propriétés non-nullable sans default DB
        // → évite TypeError 'must not be accessed before initialization'
        $this->title    = '';
        $this->address  = '';
        $this->rent     = 0.0;
        $this->ownerId  = ''; // Doit être remplacé par setOwnerId() avant persist
    }

    // ── Getters / Setters ─────────────────────────────────────────────
    public function getId(): string { return $this->id; }
    public function getOwnerId(): string { return $this->ownerId; }
    public function setOwnerId(string $v): static { $this->ownerId = $v; return $this; }
    public function getOrganizationId(): ?string { return $this->organizationId; }
    public function setOrganizationId(?string $v): static { $this->organizationId = $v; return $this; }

    public function getTitle(): string { return $this->title; }
    public function setTitle(string $v): static { $this->title = trim($v); return $this; }
    public function getSubtitle(): ?string { return $this->subtitle; }
    public function setSubtitle(?string $v): static { $this->subtitle = $v ? trim($v) : null; return $this; }
    public function getPropertyType(): string { return $this->propertyType; }
    public function setPropertyType(string $v): static { $this->propertyType = $v; return $this; }
    public function getAddress(): string { return $this->address; }
    public function setAddress(string $v): static { $this->address = trim($v); return $this; }
    public function getSurface(): ?float { return $this->surface; }
    public function setSurface(?float $v): static { $this->surface = $v; return $this; }
    public function getRooms(): ?int { return $this->rooms; }
    public function setRooms(?int $v): static { $this->rooms = $v; return $this; }
    public function getBedrooms(): ?int { return $this->bedrooms; }
    public function setBedrooms(?int $v): static { $this->bedrooms = $v; return $this; }
    public function getBathrooms(): ?int { return $this->bathrooms; }
    public function setBathrooms(?int $v): static { $this->bathrooms = $v; return $this; }

    public function getRent(): float { return $this->rent; }
    public function setRent(float $v): static { $this->rent = $v; return $this; }
    public function getCharges(): float { return $this->charges; }
    public function setCharges(float $v): static { $this->charges = $v; return $this; }
    public function getDeposit(): float { return $this->deposit; }
    public function setDeposit(float $v): static { $this->deposit = $v; return $this; }
    public function getRentalType(): string { return $this->rentalType; }
    public function setRentalType(string $v): static { $this->rentalType = $v; return $this; }
    public function getMinDuration(): int { return $this->minDuration; }
    public function setMinDuration(int $v): static { $this->minDuration = $v; return $this; }

    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $v): static { $this->description = $v; return $this; }
    public function getAmenities(): array { return $this->amenities; }
    public function setAmenities(array $v): static { $this->amenities = $v; return $this; }
    public function getPhotos(): array { return $this->photos; }
    public function setPhotos(array $v): static { $this->photos = $v; return $this; }
    public function getDocumentsRequired(): array { return $this->documentsRequired; }
    public function setDocumentsRequired(array $v): static { $this->documentsRequired = $v; return $this; }

    public function getAvailableAt(): ?\DateTimeImmutable { return $this->availableAt; }
    public function setAvailableAt(?\DateTimeImmutable $v): static { $this->availableAt = $v; return $this; }

    public function getStatus(): string { return $this->status; }
    public function setStatus(string $v): static { $this->status = $v; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getPublishedAt(): ?\DateTimeImmutable { return $this->publishedAt; }
    public function setPublishedAt(?\DateTimeImmutable $v): static { $this->publishedAt = $v; return $this; }
    public function getUpdatedAt(): ?\DateTimeImmutable { return $this->updatedAt; }
    public function touch(): void { $this->updatedAt = new \DateTimeImmutable(); }

    public function getDpe(): ?string { return $this->dpe; }
    public function setDpe(?string $v): static { $this->dpe = ($v && in_array(strtoupper($v), ['A','B','C','D','E','F','G'], true)) ? strtoupper($v) : null; return $this; }
    public function getGes(): ?string { return $this->ges; }
    public function setGes(?string $v): static { $this->ges = ($v && in_array(strtoupper($v), ['A','B','C','D','E','F','G'], true)) ? strtoupper($v) : null; return $this; }
    public function getFloor(): ?int { return $this->floor; }
    public function setFloor(?int $v): static { $this->floor = ($v !== null && $v >= -3 && $v <= 60) ? $v : null; return $this; }
    public function hasElevator(): bool { return $this->hasElevator; }
    public function setHasElevator(bool $v): static { $this->hasElevator = $v; return $this; }
    public function getHeatingType(): ?string { return $this->heatingType; }
    public function setHeatingType(?string $v): static
    {
        $allowed = ['individuel_gaz','individuel_electrique','collectif','pompe_chaleur','autre'];
        $this->heatingType = ($v && in_array($v, $allowed, true)) ? $v : null;
        return $this;
    }
    public function getExtras(): array { return $this->extras; }
    /** Champs libres du propriétaire — sanitisés, bornés à 20 entrées */
    public function setExtras(array $items): static
    {
        $clean = [];
        foreach (array_slice($items, 0, 20) as $it) {
            if (!is_array($it)) continue;
            $label = mb_substr(strip_tags(trim((string) ($it['label'] ?? ''))), 0, 60);
            $value = mb_substr(strip_tags(trim((string) ($it['value'] ?? ''))), 0, 200);
            if ($label !== '' && $value !== '') $clean[] = ['label' => $label, 'value' => $value];
        }
        $this->extras = $clean;
        return $this;
    }

    public function getSlug(): ?string { return $this->slug; }
    public function setSlug(?string $v): static { $this->slug = $v; return $this; }
    public function isPreciseAddressVisible(): bool { return $this->preciseAddressVisible; }
    public function setPreciseAddressVisible(bool $v): static { $this->preciseAddressVisible = $v; return $this; }

    /** Adresse publique : ville seule si l'adresse exacte est masquée (RGPD) */
    public function getPublicAddress(): string
    {
        if ($this->preciseAddressVisible) return $this->address;
        $parts = array_map('trim', explode(',', $this->address));
        return $parts ? end($parts) : '';
    }

    /** Génère un slug URL-safe depuis le titre + suffixe id (unicité garantie) */
    public function generateSlug(): void
    {
        $base = mb_strtolower($this->title);
        $base = preg_replace('/[^a-z0-9]+/u', '-', str_replace(
            ['à','â','ä','é','è','ê','ë','î','ï','ô','ö','ù','û','ü','ç'],
            ['a','a','a','e','e','e','e','i','i','o','o','u','u','u','c'],
            $base
        ));
        $base = trim((string) $base, '-');
        $this->slug = mb_substr($base, 0, 80) . '-' . substr($this->id, 0, 6);
    }

    public function isOwner(string $userId): bool { return $this->ownerId === $userId; }
    public function isPublished(): bool { return $this->status === 'active'; }
    public function isDraft(): bool { return $this->status === 'draft'; }
}
