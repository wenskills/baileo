<?php
declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Application;
use App\Entity\Campaign;
use App\Entity\Message;
use App\Entity\RentalPassport;
use App\Entity\User;
use App\Entity\VisitBooking;
use App\Entity\VisitFeedback;
use App\Entity\VisitSlot;
use App\Service\OrganizationPermissionService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;


#[Route('/api')]
final class ActionCenterController extends AbstractController
{
    public function __construct(private readonly OrganizationPermissionService $perms) {}

    #[Route('/action-center', methods: ['GET'])]
    public function actionCenter(EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user = $sec->getUser();

        // Périmètre : mes campagnes + celles de mon organisation (si membre actif)
        $orgId = $user->getOrganizationId();
        $orgOk = $orgId && $this->perms->canView($user, $orgId);
        $campaigns = $orgOk
            ? $em->createQuery('SELECT c FROM App\Entity\Campaign c WHERE c.ownerId = :uid OR c.organizationId = :oid')
                 ->setParameter('uid', $user->getId())->setParameter('oid', $orgId)->getResult()
            : $em->getRepository(Campaign::class)->findBy(['ownerId' => $user->getId()]);

        $campaignIds = array_map(fn(Campaign $c) => $c->getId(), $campaigns);
        $byId        = [];
        foreach ($campaigns as $c) $byId[$c->getId()] = $c;

        $items = [
            'documentsToReview' => [],
            'unansweredCandidates' => [],
            'visitsToConfirm' => [],
            'feedbackMissing' => [],
            'decisionsPending' => [],
            'draftCampaigns' => [],
        ];

        // Campagnes incomplètes (brouillons)
        foreach ($campaigns as $c) {
            if ($c->getStatus() === 'draft') {
                $items['draftCampaigns'][] = [
                    'label' => $c->getTitle() ?: 'Brouillon sans titre',
                    'link'  => '/campagnes/creer?draft=' . $c->getId(),
                ];
            }
        }

        if ($campaignIds) {
            $active = $em->createQuery(
                'SELECT a FROM App\Entity\Application a
                 WHERE a.campaignId IN (:ids) AND a.status NOT IN (:closed)'
            )->setParameter('ids', $campaignIds)
             ->setParameter('closed', ['accepted', 'refused', 'cancelled', 'withdrawn'])
             ->setMaxResults(300)->getResult();

            $now = new \DateTimeImmutable();
            $threeDaysAgo = $now->modify('-3 days');

            foreach ($active as $app) {
                $campaign  = $byId[$app->getCampaignId()] ?? null;
                if (!$campaign) continue;
                $candidate = $em->getRepository(User::class)->find($app->getCandidateId());
                $name      = $candidate ? $candidate->getFirstName() . ' ' . mb_substr($candidate->getLastName(), 0, 1) . '.' : 'Candidat';
                $link      = '/candidatures/' . $app->getId();

                // Décisions en attente
                if ($app->getStatus() === 'decision') {
                    $items['decisionsPending'][] = ['label' => $name . ' — ' . $campaign->getTitle(), 'link' => $link];
                }

                // Documents à vérifier (pièces requises téléversées, non revues)
                $required = $campaign->getDocumentsRequired();
                if ($required) {
                    $passport = $em->getRepository(RentalPassport::class)->findOneBy(['userId' => $app->getCandidateId()]);
                    foreach ($passport?->getDocuments() ?? [] as $d) {
                        if (in_array($d['type'] ?? '', $required, true) && ($d['status'] ?? 'uploaded') === 'uploaded') {
                            $items['documentsToReview'][] = ['label' => $name . ' — pièce à vérifier', 'link' => $link];
                            break;
                        }
                    }
                }

                // Candidat sans réponse depuis 3 jours (dernier message = candidat)
                $last = $em->getRepository(Message::class)->findOneBy(
                    ['applicationId' => $app->getId()], ['createdAt' => 'DESC']
                );
                if ($last && $last->getSenderRole() === 'candidate' && $last->getCreatedAt() < $threeDaysAgo) {
                    $items['unansweredCandidates'][] = ['label' => $name . ' attend une réponse', 'link' => '/messages?application=' . $app->getId()];
                }

                // Visites : à confirmer / feedback manquant
                foreach ($em->getRepository(VisitBooking::class)->findBy(['applicationId' => $app->getId()]) as $b) {
                    if (in_array($b->getStatus(), ['cancelled', 'no_show'], true)) continue;
                    $slot = $em->getRepository(VisitSlot::class)->find($b->getSlotId());
                    if (!$slot) continue;
                    if ($b->getStatus() === 'booked' && $slot->getStartsAt() > $now) {
                        $items['visitsToConfirm'][] = ['label' => $name . ' — visite du ' . $slot->getStartsAt()->format('d/m à H\hi'), 'link' => '/visites'];
                    }
                    if ($slot->getEndsAt() < $now && $b->getStatus() !== 'cancelled') {
                        $fb = $em->getRepository(VisitFeedback::class)->findOneBy(['applicationId' => $app->getId()]);
                        if (!$fb) {
                            $items['feedbackMissing'][] = ['label' => $name . ' — fiche post-visite à remplir', 'link' => $link];
                        }
                    }
                }
            }
        }

        $meta = [
            'documentsToReview'    => ['title' => 'Documents à vérifier',        'priority' => 'high'],
            'decisionsPending'     => ['title' => 'Décisions en attente',        'priority' => 'high'],
            'unansweredCandidates' => ['title' => 'Candidats sans réponse (3j+)', 'priority' => 'medium'],
            'visitsToConfirm'      => ['title' => 'Visites à venir',             'priority' => 'medium'],
            'feedbackMissing'      => ['title' => 'Fiches post-visite',          'priority' => 'medium'],
            'draftCampaigns'       => ['title' => 'Campagnes à terminer',        'priority' => 'low'],
        ];
        $out = [];
        foreach ($items as $key => $list) {
            // dédoublonner par label+link
            $seen = []; $unique = [];
            foreach ($list as $it) {
                $k = $it['label'] . '|' . $it['link'];
                if (!isset($seen[$k])) { $seen[$k] = true; $unique[] = $it; }
            }
            $out[] = [
                'key'      => $key,
                'title'    => $meta[$key]['title'],
                'priority' => $meta[$key]['priority'],
                'count'    => count($unique),
                'items'    => array_slice($unique, 0, 5),
            ];
        }
        $total = array_sum(array_map(fn($o) => $o['count'], $out));

        return $this->json(['total' => $total, 'sections' => $out]);
    }
}
