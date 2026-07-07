<?php
declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Notification in-app.
 * Un utilisateur ne voit QUE ses propres notifications (contrôlé dans le controller).
 */
#[ORM\Entity]
#[ORM\Table(name: 'notification')]
#[ORM\Index(columns: ['user_id'], name: 'idx_notif_user')]
#[ORM\Index(columns: ['read_at'], name: 'idx_notif_read')]
class Notification
{
    public const TYPES = [
        'application_created', 'status_changed', 'document_requested',
        'document_uploaded', 'visit_booked', 'visit_cancelled',
        'message_received', 'application_accepted', 'application_rejected',
    ];

    #[ORM\Id]
    #[ORM\Column(type: 'string', length: 36)]
    private string $id;

    #[ORM\Column(length: 36)]
    private string $userId;

    #[ORM\Column(length: 50)]
    private string $type;

    #[ORM\Column(length: 200)]
    private string $title;

    #[ORM\Column(length: 500)]
    private string $body;

    /** Lien interne de l'app (ex: /candidatures?campaign=xxx) — jamais d'URL externe */
    #[ORM\Column(length: 300, nullable: true)]
    private ?string $link = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $readAt = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->id        = Uuid::v4()->toRfc4122();
        $this->createdAt = new \DateTimeImmutable();
        $this->userId    = '';
        $this->type      = '';
        $this->title     = '';
        $this->body      = '';
    }

    public function getId(): string { return $this->id; }
    public function getUserId(): string { return $this->userId; }
    public function setUserId(string $v): static { $this->userId = $v; return $this; }
    public function getType(): string { return $this->type; }
    public function setType(string $v): static { $this->type = $v; return $this; }
    public function getTitle(): string { return $this->title; }
    public function setTitle(string $v): static { $this->title = mb_substr(strip_tags(trim($v)), 0, 200); return $this; }
    public function getBody(): string { return $this->body; }
    public function setBody(string $v): static { $this->body = mb_substr(strip_tags(trim($v)), 0, 500); return $this; }
    public function getLink(): ?string { return $this->link; }
    public function setLink(?string $v): static
    {
        // Sécurité : uniquement des chemins internes relatifs, jamais d'URL absolue
        if ($v !== null && (str_starts_with($v, 'http://') || str_starts_with($v, 'https://') || str_starts_with($v, '//'))) {
            $v = null;
        }
        $this->link = $v ? mb_substr($v, 0, 300) : null;
        return $this;
    }
    public function isRead(): bool { return $this->readAt !== null; }
    public function markRead(): void { $this->readAt = new \DateTimeImmutable(); }
    public function getReadAt(): ?\DateTimeImmutable { return $this->readAt; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
