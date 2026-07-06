<?php
declare(strict_types=1);

namespace App\Service;

use App\Entity\Application;
use App\Entity\Campaign;
use App\Entity\RentalPassport;
use App\Entity\VisitBooking;
use App\Entity\VisitSlot;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Salle de décision (spec : Decision Room + Decision Checklist).
 * Toute la logique de contrôle est SERVEUR : le frontend affiche,
 * le backend décide de ce qui est permis.
 */
final class DecisionService
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    /**
     * Checklist factuelle avant décision — jamais bloquante pour un refus,
     * informative pour une acceptation (le propriétaire décide en connaissance).
     */
    public function checklist(Application $app, Campaign $campaign): array
    {
        // Documents requis validés ?
        $required  = $campaign->getDocumentsRequired();
        $passport  = $this->em->getRepository(RentalPassport::class)->findOneBy(['userId' => $app->getCandidateId()]);
        $byType    = [];
        foreach ($passport?->getDocuments() ?? [] as $d) {
            $byType[$d['type'] ?? ''] = $d['status'] ?? 'uploaded';
        }
        $missing   = array_values(array_filter($required, fn($t) => !isset($byType[$t])));
        $unvalidated = array_values(array_filter($required, fn($t) => isset($byType[$t]) && $byType[$t] !== 'validated'));

        // Visite réalisée ? (réservation active dont le créneau est passé)
        $visitDone = false;
        $bookings  = $this->em->getRepository(VisitBooking::class)->findBy(['applicationId' => $app->getId()]);
        $now = new \DateTimeImmutable();
        foreach ($bookings as $b) {
            if ($b->getStatus() === 'cancelled') continue;
            $slot = $this->em->getRepository(VisitSlot::class)->find($b->getSlotId());
            if ($slot && $slot->getEndsAt() < $now) { $visitDone = true; break; }
        }

        return [
            'documentsRequired'   => count($required),
            'documentsMissing'    => $missing,
            'documentsUnvalidated' => $unvalidated,
            'documentsOk'         => !$missing && !$unvalidated,
            'visitDone'           => $visitDone,
            'currentStatus'       => $app->getStatus(),
        ];
    }

    /**
     * Transition autorisée ? Une candidature clôturée ne peut plus être décidée.
     * @return string|null message d'erreur ou null si OK
     */
    public function validateTransition(Application $app, string $decision): ?string
    {
        if (in_array($app->getStatus(), ['withdrawn', 'cancelled'], true)) {
            return 'Cette candidature est clôturée (retirée ou annulée).';
        }
        if ($app->getStatus() === 'accepted' && $decision !== 'cancelled') {
            return 'Cette candidature est déjà acceptée.';
        }
        if (!in_array($decision, ['accepted', 'rejected', 'waitlisted', 'cancelled'], true)) {
            return 'Décision invalide.';
        }
        return null;
    }

    /** Mapping décision → statut interne de la candidature. */
    public function statusFor(string $decision): string
    {
        return match ($decision) {
            'accepted'   => 'accepted',
            'rejected'   => 'refused',
            'waitlisted' => 'waitlist',
            'cancelled'  => 'cancelled',
            default      => 'refused',
        };
    }
}
