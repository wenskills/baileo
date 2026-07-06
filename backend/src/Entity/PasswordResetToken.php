<?php
declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity]
#[ORM\Table(name: 'password_reset_token')]
// Index sur la colonne SQL 'user_id' (Doctrine mappe 'userId' → 'user_id' automatiquement)
#[ORM\Index(columns: ['user_id'], name: 'idx_prt_user_id')]
class PasswordResetToken
{
    #[ORM\Id]
    #[ORM\Column(type: 'string', length: 36)]
    private string $id;

    /** Token aléatoire 64 hex chars, transmis par email */
    #[ORM\Column(unique: true, length: 64)]
    private string $token;

    #[ORM\Column(length: 36)]
    private string $userId;

    #[ORM\Column]
    private \DateTimeImmutable $expiresAt;

    #[ORM\Column(options: ['default' => false])]
    private bool $used = false;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct(string $userId)
    {
        $this->id        = Uuid::v4()->toRfc4122();
        $this->token     = bin2hex(random_bytes(32)); // 64 hex chars
        $this->userId    = $userId;
        $this->expiresAt = new \DateTimeImmutable('+1 hour');
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getToken(): string { return $this->token; }
    public function getUserId(): string { return $this->userId; }
    public function isUsed(): bool { return $this->used; }
    public function isExpired(): bool { return $this->expiresAt < new \DateTimeImmutable(); }
    public function markUsed(): void { $this->used = true; }
}
