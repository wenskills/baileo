<?php
declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity]
#[ORM\Table(name: 'organization')]
class Organization
{
    #[ORM\Id]
    #[ORM\Column(type: 'string', length: 36)]
    private string $id;

    #[ORM\Column(length: 255)]
    private string $name;

    /** owner | agency | candidate */
    #[ORM\Column(length: 50)]
    private string $type;

    #[ORM\Column(length: 36)]
    private string $ownerId;

    #[ORM\Column(length: 14, nullable: true)]  private ?string $siret = null;
    #[ORM\Column(length: 200, nullable: true)] private ?string $address = null;
    #[ORM\Column(length: 100, nullable: true)] private ?string $city = null;
    #[ORM\Column(length: 10, nullable: true)]  private ?string $postalCode = null;
    #[ORM\Column(length: 180, nullable: true)] private ?string $billingEmail = null;
    #[ORM\Column(nullable: true)] private ?\DateTimeImmutable $updatedAt = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct(string $name, string $type, string $ownerId)
    {
        $this->id = Uuid::v4()->toRfc4122();
        $this->name = $name;
        $this->type = $type;
        $this->ownerId = $ownerId;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): string { return $this->id; }
    public function getName(): string { return $this->name; }
    public function getType(): string { return $this->type; }
    public function getOwnerId(): string { return $this->ownerId; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }

    public function getSiret(): ?string { return $this->siret; }
    public function setSiret(?string $v): static { $this->siret = $v ? mb_substr(preg_replace('/\D/', '', $v), 0, 14) : null; return $this; }
    public function getAddress(): ?string { return $this->address; }
    public function setAddress(?string $v): static { $this->address = $v ? mb_substr(strip_tags(trim($v)), 0, 200) : null; return $this; }
    public function getCity(): ?string { return $this->city; }
    public function setCity(?string $v): static { $this->city = $v ? mb_substr(strip_tags(trim($v)), 0, 100) : null; return $this; }
    public function getPostalCode(): ?string { return $this->postalCode; }
    public function setPostalCode(?string $v): static { $this->postalCode = $v ? mb_substr(preg_replace('/[^\dA-Za-z]/', '', $v), 0, 10) : null; return $this; }
    public function getBillingEmail(): ?string { return $this->billingEmail; }
    public function setBillingEmail(?string $v): static { $this->billingEmail = $v ? mb_substr(trim($v), 0, 180) : null; return $this; }
    public function getUpdatedAt(): ?\DateTimeImmutable { return $this->updatedAt; }
    public function touch(): void { $this->updatedAt = new \DateTimeImmutable(); }
}
