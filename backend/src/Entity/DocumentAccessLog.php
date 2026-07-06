<?php
declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Journal d'accès aux documents (RGPD : traçabilité des consultations).
 * Chaque vue/téléchargement/validation d'une pièce est enregistré —
 * le candidat peut consulter qui a accédé à son dossier.
 */
#[ORM\Entity]
#[ORM\Table(name: 'document_access_log')]
#[ORM\Index(name: 'idx_dal_candidate', columns: ['candidate_id'])]
class DocumentAccessLog
{
    #[ORM\Id]
    #[ORM\Column(type: 'string', length: 36)]
    private string $id;

    /** Propriétaire du document (candidat) */
    #[ORM\Column(length: 36)]
    private string $candidateId;

    #[ORM\Column(length: 40)]
    private string $documentType;

    /** Qui a accédé */
    #[ORM\Column(length: 36)]
    private string $viewerId;

    #[ORM\Column(length: 30)]
    private string $action; // view | download | validate | reject | request_replacement

    #[ORM\Column(length: 45, nullable: true)]
    private ?string $ipAddress = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct(string $candidateId, string $documentType, string $viewerId, string $action, ?string $ip = null)
    {
        $this->id           = Uuid::v4()->toRfc4122();
        $this->candidateId  = $candidateId;
        $this->documentType = $documentType;
        $this->viewerId     = $viewerId;
        $this->action       = in_array($action, ['view','download','validate','reject','request_replacement'], true) ? $action : 'view';
        $this->ipAddress    = $ip ? mb_substr($ip, 0, 45) : null;
        $this->createdAt    = new \DateTimeImmutable();
    }

    public function getId(): string { return $this->id; }
    public function getCandidateId(): string { return $this->candidateId; }
    public function getDocumentType(): string { return $this->documentType; }
    public function getViewerId(): string { return $this->viewerId; }
    public function getAction(): string { return $this->action; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
