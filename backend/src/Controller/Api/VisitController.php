<?php
declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Application;
use App\Entity\Campaign;
use App\Entity\User;
use App\Entity\VisitBooking;
use App\Entity\VisitSlot;
use App\Service\ActivityService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Visit Scheduler (spec module 11).
 *
 * Sécurité :
 *  - seul le propriétaire de la campagne crée/ferme des créneaux
 *  - un candidat ne peut réserver QUE s'il a une candidature active sur la campagne
 *  - un candidat ne peut pas avoir deux réservations actives sur la même campagne
 *  - impossible de réserver un créneau complet, fermé ou passé
 *  - le champ location n'est visible qu'après réservation (jamais public)
 *  - chaque réservation/annulation crée un TimelineEvent + une Notification
 */
#[Route('/api')]
final class VisitController extends AbstractController
{
    public function __construct(private readonly ActivityService $activity) {}

    // ─────────────────────────────────────────────────────────────────
    // CREATE SLOT — POST /api/campaigns/{id}/visit-slots (owner)
    // ─────────────────────────────────────────────────────────────────
    #[Route('/campaigns/{id}/visit-slots', methods: ['POST'])]
    public function createSlot(string $id, Request $request, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        $campaign = $em->getRepository(Campaign::class)->find($id);
        if (!$campaign) return $this->json(['error' => 'Campagne introuvable.'], 404);

        /** @var User $user */
        $user = $sec->getUser();
        if (!$campaign->isOwner($user->getId())) return $this->json(['error' => 'Accès refusé.'], 403);

        $decoded = json_decode($request->getContent(), true);
        $data    = is_array($decoded) ? $decoded : [];

        // ── Validation stricte ────────────────────────────────────────
        try {
            // Le <input datetime-local> envoie "2026-07-30T09:00" SANS fuseau :
            // on l'interprète en heure de Paris (sinon PHP suppose UTC → 9h devient 11h à l'affichage)
            $tz       = new \DateTimeZone('Europe/Paris');
            $startsAt = new \DateTimeImmutable((string) ($data['startsAt'] ?? ''), $tz);
            $endsAt   = new \DateTimeImmutable((string) ($data['endsAt'] ?? ''), $tz);
        } catch (\Throwable) {
            return $this->json(['error' => 'Dates invalides.'], 422);
        }
        if ($startsAt <= new \DateTimeImmutable()) {
            return $this->json(['error' => 'Le créneau doit être dans le futur.'], 422);
        }
        if ($endsAt <= $startsAt) {
            return $this->json(['error' => 'L\'heure de fin doit être après le début.'], 422);
        }
        if ($endsAt->getTimestamp() - $startsAt->getTimestamp() > 8 * 3600) {
            return $this->json(['error' => 'Un créneau ne peut pas dépasser 8 heures.'], 422);
        }
        $capacity = (int) ($data['capacity'] ?? 1);
        if ($capacity < 1 || $capacity > 50) {
            return $this->json(['error' => 'Capacité invalide (1 à 50).'], 422);
        }

        $slot = new VisitSlot();
        $slot->setCampaignId($campaign->getId())
             ->setStartsAt($startsAt)
             ->setEndsAt($endsAt)
             ->setCapacity($capacity)
             ->setLocation(isset($data['location']) ? (string) $data['location'] : null);

        $em->persist($slot);
        $em->flush();

        return $this->json($this->serializeSlot($slot, true), 201);
    }

    // ─────────────────────────────────────────────────────────────────
    // LIST SLOTS — GET /api/campaigns/{id}/visit-slots
    //   Owner  → tous les créneaux + réservations détaillées
    //   Candidat avec candidature → créneaux réservables + sa réservation
    // ─────────────────────────────────────────────────────────────────
    #[Route('/campaigns/{id}/visit-slots', methods: ['GET'])]
    public function listSlots(string $id, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        $campaign = $em->getRepository(Campaign::class)->find($id);
        if (!$campaign) return $this->json(['error' => 'Campagne introuvable.'], 404);

        /** @var User $user */
        $user    = $sec->getUser();
        $isOwner = $campaign->isOwner($user->getId());

        // Candidat : doit avoir une candidature sur la campagne
        $myApplication = null;
        if (!$isOwner) {
            $myApplication = $em->getRepository(Application::class)->findOneBy([
                'campaignId'  => $campaign->getId(),
                'candidateId' => $user->getId(),
            ]);
            if (!$myApplication) {
                return $this->json(['error' => 'Vous devez candidater avant de consulter les visites.'], 403);
            }
        }

        $slots = $em->getRepository(VisitSlot::class)->findBy(
            ['campaignId' => $campaign->getId()],
            ['startsAt' => 'ASC']
        );

        // Pré-charger les réservations actives d'un coup (anti N+1)
        $slotIds = array_map(fn($s) => $s->getId(), $slots);
        $bookings = $slotIds ? $em->createQuery(
            'SELECT b FROM App\Entity\VisitBooking b WHERE b.slotId IN (:ids) AND b.status = :st'
        )->setParameter('ids', $slotIds)->setParameter('st', 'booked')->getResult() : [];

        $bookingsBySlot = [];
        foreach ($bookings as $b) { $bookingsBySlot[$b->getSlotId()][] = $b; }

        $data = [];
        foreach ($slots as $slot) {
            $row = $this->serializeSlot($slot, $isOwner);

            if ($isOwner) {
                // Owner : voir qui a réservé (nom via User, jamais l'email complet côté liste)
                $slotBookings = $bookingsBySlot[$slot->getId()] ?? [];
                $row['bookings'] = array_map(function (VisitBooking $b) use ($em) {
                    $candidate = $em->getRepository(User::class)->find($b->getCandidateId());
                    return [
                        'id'            => $b->getId(),
                        'applicationId' => $b->getApplicationId(),
                        'candidateName' => $candidate
                            ? $candidate->getFirstName() . ' ' . mb_substr($candidate->getLastName(), 0, 1) . '.'
                            : 'Candidat',
                        'bookedAt'      => $b->getBookedAt()->format('c'),
                    ];
                }, $slotBookings);
            } else {
                // Candidat : sa propre réservation éventuelle sur ce slot
                $mine = array_filter(
                    $bookingsBySlot[$slot->getId()] ?? [],
                    fn(VisitBooking $b) => $b->getCandidateId() === $user->getId()
                );
                $myBooking = $mine ? array_values($mine)[0] : null;
                $row['myBookingId'] = $myBooking?->getId();
                // location visible uniquement si le candidat a réservé CE créneau
                if (!$myBooking) unset($row['location']);
            }

            $data[] = $row;
        }

        return $this->json(['data' => $data]);
    }

    // ─────────────────────────────────────────────────────────────────
    // CLOSE SLOT — DELETE /api/visit-slots/{id} (owner)
    //   Annule le créneau + toutes ses réservations actives (avec notifs)
    // ─────────────────────────────────────────────────────────────────
    #[Route('/visit-slots/{id}', methods: ['DELETE'])]
    public function cancelSlot(string $id, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        $slot = $em->getRepository(VisitSlot::class)->find($id);
        if (!$slot) return $this->json(['error' => 'Créneau introuvable.'], 404);

        $campaign = $em->getRepository(Campaign::class)->find($slot->getCampaignId());
        /** @var User $user */
        $user = $sec->getUser();
        if (!$campaign || !$campaign->isOwner($user->getId())) {
            return $this->json(['error' => 'Accès refusé.'], 403);
        }

        $slot->setStatus('cancelled');

        // Annuler les réservations actives + notifier chaque candidat
        $activeBookings = $em->getRepository(VisitBooking::class)->findBy([
            'slotId' => $slot->getId(), 'status' => 'booked',
        ]);
        foreach ($activeBookings as $booking) {
            $booking->cancel();
            $slot->decrementBooked();
            $this->activity->log(
                $booking->getApplicationId(), 'visit_cancelled',
                'Le créneau de visite du ' . $slot->getStartsAt()->format('d/m/Y à H:i') . ' a été annulé par le propriétaire.',
                $user->getId(), 'owner'
            );
            $this->activity->notify(
                $booking->getCandidateId(), 'visit_cancelled',
                'Visite annulée',
                'Le créneau du ' . $slot->getStartsAt()->format('d/m/Y à H:i') . ' pour « ' . $campaign->getTitle() . ' » a été annulé.',
                '/mes-candidatures'
            );
        }

        $em->flush();
        return $this->json(['cancelled' => true, 'bookingsCancelled' => count($activeBookings)]);
    }

    // ─────────────────────────────────────────────────────────────────
    // BOOK — POST /api/visit-slots/{id}/book (candidat)
    // ─────────────────────────────────────────────────────────────────
    #[Route('/visit-slots/{id}/book', methods: ['POST'])]
    public function book(string $id, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        $slot = $em->getRepository(VisitSlot::class)->find($id);
        if (!$slot) return $this->json(['error' => 'Créneau introuvable.'], 404);

        /** @var User $user */
        $user = $sec->getUser();

        $campaign = $em->getRepository(Campaign::class)->find($slot->getCampaignId());
        if (!$campaign) return $this->json(['error' => 'Campagne introuvable.'], 404);

        // Règle : candidature obligatoire, et active
        $application = $em->getRepository(Application::class)->findOneBy([
            'campaignId'  => $campaign->getId(),
            'candidateId' => $user->getId(),
        ]);
        if (!$application) {
            return $this->json(['error' => 'Vous devez candidater avant de réserver une visite.'], 403);
        }
        if (!$application->isActive()) {
            return $this->json(['error' => 'Votre candidature est clôturée.'], 422);
        }

        // Règle : créneau réservable (ouvert, futur, non complet)
        if (!$slot->isBookable()) {
            return $this->json(['error' => 'Ce créneau n\'est plus disponible.'], 422);
        }

        // Règle : pas deux réservations actives sur la même campagne
        $existing = $em->createQuery(
            'SELECT COUNT(b.id) FROM App\Entity\VisitBooking b
             JOIN App\Entity\VisitSlot s WITH s.id = b.slotId
             WHERE b.candidateId = :uid AND b.status = :st AND s.campaignId = :cid'
        )->setParameter('uid', $user->getId())
         ->setParameter('st', 'booked')
         ->setParameter('cid', $campaign->getId())
         ->getSingleScalarResult();
        if ((int) $existing > 0) {
            return $this->json(['error' => 'Vous avez déjà une visite réservée sur cette campagne.'], 409);
        }

        $booking = new VisitBooking();
        $booking->setSlotId($slot->getId())
                ->setApplicationId($application->getId())
                ->setCandidateId($user->getId());
        $slot->incrementBooked();

        // Avancer la candidature dans le pipeline si elle est en amont
        if (in_array($application->getStatus(), ['new', 'prequalification', 'documents'], true)) {
            $old = $application->getStatus();
            $application->setStatus('visite');
            $this->activity->log(
                $application->getId(), 'status_changed',
                'Statut passé de « ' . $old . ' » à « visite » suite à la réservation.',
                null, 'system', $old, 'visite'
            );
        }

        $this->activity->log(
            $application->getId(), 'visit_booked',
            'Visite réservée le ' . $slot->getStartsAt()->format('d/m/Y à H:i') . '.',
            $user->getId(), 'candidate'
        );
        $this->activity->notify(
            $campaign->getOwnerId(), 'visit_booked',
            'Nouvelle visite réservée',
            $user->getFirstName() . ' a réservé le ' . $slot->getStartsAt()->format('d/m/Y à H:i') . ' pour « ' . $campaign->getTitle() . ' ».',
            '/visites'
        );

        $em->persist($booking);
        $em->flush();

        return $this->json([
            'id'       => $booking->getId(),
            'slotId'   => $slot->getId(),
            'startsAt' => $slot->getStartsAt()->format('c'),
            'endsAt'   => $slot->getEndsAt()->format('c'),
            'location' => $slot->getLocation(),
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────
    // CANCEL BOOKING — POST /api/visit-bookings/{id}/cancel
    //   Candidat (sa réservation) ou propriétaire de la campagne
    // ─────────────────────────────────────────────────────────────────
    #[Route('/visit-bookings/{id}/cancel', methods: ['POST'])]
    public function cancelBooking(string $id, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        $booking = $em->getRepository(VisitBooking::class)->find($id);
        if (!$booking) return $this->json(['error' => 'Réservation introuvable.'], 404);
        if (!$booking->isActive()) return $this->json(['error' => 'Réservation déjà annulée.'], 422);

        $slot     = $em->getRepository(VisitSlot::class)->find($booking->getSlotId());
        $campaign = $slot ? $em->getRepository(Campaign::class)->find($slot->getCampaignId()) : null;

        /** @var User $user */
        $user        = $sec->getUser();
        $isCandidate = $booking->getCandidateId() === $user->getId();
        $isOwner     = $campaign && $campaign->isOwner($user->getId());
        if (!$isCandidate && !$isOwner) {
            return $this->json(['error' => 'Accès refusé.'], 403);
        }

        $booking->cancel();
        $slot?->decrementBooked();

        $when = $slot ? $slot->getStartsAt()->format('d/m/Y à H:i') : '';
        $this->activity->log(
            $booking->getApplicationId(), 'visit_cancelled',
            'Visite du ' . $when . ' annulée.',
            $user->getId(), $isCandidate ? 'candidate' : 'owner'
        );
        // Notifier l'autre partie
        if ($isCandidate && $campaign) {
            $this->activity->notify(
                $campaign->getOwnerId(), 'visit_cancelled', 'Visite annulée',
                $user->getFirstName() . ' a annulé sa visite du ' . $when . ' pour « ' . $campaign->getTitle() . ' ».',
                '/visites'
            );
        } elseif ($isOwner) {
            $this->activity->notify(
                $booking->getCandidateId(), 'visit_cancelled', 'Visite annulée',
                'Votre visite du ' . $when . ($campaign ? ' pour « ' . $campaign->getTitle() . ' »' : '') . ' a été annulée par le propriétaire.',
                '/mes-candidatures'
            );
        }

        $em->flush();
        return $this->json(['cancelled' => true]);
    }

    // ─────────────────────────────────────────────────────────────────
    // UPCOMING — GET /api/visits/upcoming
    //   Owner    → réservations à venir sur SES campagnes
    //   Candidat → SES réservations à venir
    //   Alimente les deux dashboards (parcours visite de bout en bout)
    // ─────────────────────────────────────────────────────────────────
    #[Route('/visits/upcoming', methods: ['GET'])]
    public function upcoming(EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user    = $sec->getUser();
        $roles   = $user->getRoles();
        $isOwner = in_array('ROLE_OWNER', $roles, true) || in_array('ROLE_AGENCY', $roles, true);
        $now     = new \DateTimeImmutable();

        if ($isOwner) {
            $rows = $em->createQuery(
                'SELECT b.id AS bookingId, s.startsAt, s.endsAt, s.location,
                        c.title AS campaignTitle, c.id AS campaignId, b.candidateId
                 FROM App\Entity\VisitBooking b
                 JOIN App\Entity\VisitSlot s WITH s.id = b.slotId
                 JOIN App\Entity\Campaign c WITH c.id = s.campaignId
                 WHERE c.ownerId = :uid AND b.status = :st AND s.startsAt > :now
                 ORDER BY s.startsAt ASC'
            )->setParameter('uid', $user->getId())
             ->setParameter('st', 'booked')
             ->setParameter('now', $now)
             ->setMaxResults(20)
             ->getArrayResult();

            // Résoudre les noms candidats en un seul appel (minimisés : Prénom + initiale)
            $candidateIds = array_values(array_unique(array_column($rows, 'candidateId')));
            $names = [];
            if ($candidateIds) {
                foreach ($em->getRepository(User::class)->findBy(['id' => $candidateIds]) as $u) {
                    $names[$u->getId()] = $u->getFirstName() . ' ' . mb_substr($u->getLastName(), 0, 1) . '.';
                }
            }
            $data = array_map(fn($r) => [
                'bookingId'     => $r['bookingId'],
                'startsAt'      => $r['startsAt'] instanceof \DateTimeImmutable ? $r['startsAt']->format('c') : $r['startsAt'],
                'endsAt'        => $r['endsAt']   instanceof \DateTimeImmutable ? $r['endsAt']->format('c')   : $r['endsAt'],
                'campaignTitle' => $r['campaignTitle'],
                'campaignId'    => $r['campaignId'],
                'candidateName' => $names[$r['candidateId']] ?? 'Candidat',
            ], $rows);
        } else {
            $rows = $em->createQuery(
                'SELECT b.id AS bookingId, s.startsAt, s.endsAt, s.location,
                        c.title AS campaignTitle, c.id AS campaignId
                 FROM App\Entity\VisitBooking b
                 JOIN App\Entity\VisitSlot s WITH s.id = b.slotId
                 JOIN App\Entity\Campaign c WITH c.id = s.campaignId
                 WHERE b.candidateId = :uid AND b.status = :st AND s.startsAt > :now
                 ORDER BY s.startsAt ASC'
            )->setParameter('uid', $user->getId())
             ->setParameter('st', 'booked')
             ->setParameter('now', $now)
             ->setMaxResults(20)
             ->getArrayResult();

            $data = array_map(fn($r) => [
                'bookingId'     => $r['bookingId'],
                'startsAt'      => $r['startsAt'] instanceof \DateTimeImmutable ? $r['startsAt']->format('c') : $r['startsAt'],
                'endsAt'        => $r['endsAt']   instanceof \DateTimeImmutable ? $r['endsAt']->format('c')   : $r['endsAt'],
                'campaignTitle' => $r['campaignTitle'],
                'campaignId'    => $r['campaignId'],
                'location'      => $r['location'], // visible : il a réservé
            ], $rows);
        }

        return $this->json(['data' => $data]);
    }

    // ─────────────────────────────────────────────────────────────────
    private function serializeSlot(VisitSlot $s, bool $forOwner): array
    {
        $row = [
            'id'          => $s->getId(),
            'campaignId'  => $s->getCampaignId(),
            'startsAt'    => $s->getStartsAt()->format('c'),
            'endsAt'      => $s->getEndsAt()->format('c'),
            'capacity'    => $s->getCapacity(),
            'bookedCount' => $s->getBookedCount(),
            'status'      => $s->getStatus(),
            'isBookable'  => $s->isBookable(),
            'location'    => $s->getLocation(), // filtré côté candidat dans listSlots()
        ];
        return $row;
    }

    // ─────────────────────────────────────────────────────────────────
    // CYCLE DE VIE D'UNE RÉSERVATION (spec Visit OS) :
    //   booked → confirmed → completed | no_show ; cancelled à tout moment.
    //   Chaque changement NOTIFIE le candidat. Une visite « réalisée »
    //   alimente l'Action Center (fiche post-visite à remplir).
    // ─────────────────────────────────────────────────────────────────
    #[Route('/visit-bookings/{id}/confirm', methods: ['POST'])]
    public function confirmBooking(string $id, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        return $this->transitionBooking($id, 'confirmed', 'Visite confirmée',
            'Votre visite est confirmée par le propriétaire.', $em, $sec);
    }

    #[Route('/visit-bookings/{id}/complete', methods: ['POST'])]
    public function completeBooking(string $id, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        return $this->transitionBooking($id, 'completed', 'Visite réalisée',
            'Merci pour votre visite ! Votre candidature est toujours étudiée.', $em, $sec);
    }

    #[Route('/visit-bookings/{id}/no-show', methods: ['POST'])]
    public function noShowBooking(string $id, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        return $this->transitionBooking($id, 'no_show', 'Visite manquée',
            'Vous n\'avez pas pu être présent à la visite. Contactez le propriétaire pour convenir d\'un nouveau créneau.', $em, $sec);
    }

    private function transitionBooking(string $id, string $status, string $title, string $body,
                                       EntityManagerInterface $em, Security $sec): JsonResponse
    {
        $booking = $em->getRepository(VisitBooking::class)->find($id);
        if (!$booking) return $this->json(['error' => 'Réservation introuvable.'], 404);

        $slot = $em->getRepository(VisitSlot::class)->find($booking->getSlotId());
        $campaign = $slot ? $em->getRepository(Campaign::class)->find($slot->getCampaignId()) : null;
        /** @var User $user */
        $user = $sec->getUser();
        if (!$campaign || !$campaign->isOwner($user->getId())) {
            return $this->json(['error' => 'Accès refusé.'], 403);
        }
        if (in_array($booking->getStatus(), ['cancelled'], true)) {
            return $this->json(['error' => 'Cette réservation est annulée.'], 422);
        }

        $booking->setStatus($status);
        $this->activity->log($booking->getApplicationId(), 'visit_booked',
            $title . '.', $user->getId(), 'owner', null, $status, 'candidate_visible');
        $this->activity->notify($booking->getCandidateId(), 'visit_booked', $title, $body,
            '/mes-candidatures/' . $booking->getApplicationId());
        $em->flush();

        return $this->json(['id' => $booking->getId(), 'status' => $status]);
    }
}
