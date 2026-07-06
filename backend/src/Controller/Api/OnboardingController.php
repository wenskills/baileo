<?php
declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Organization;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/onboarding')]
final class OnboardingController extends AbstractController
{
    #[Route('/complete', methods: ['POST'])]
    public function complete(
        Request $request,
        Security $security,
        EntityManagerInterface $em
    ): JsonResponse {
        /** @var User|null $user */
        $user = $security->getUser();

        // Defensive check — le firewall JWT garantit normalement l'authentification,
        // mais si l'utilisateur a été supprimé depuis l'émission du token :
        if (!$user instanceof User) {
            return $this->json(['error' => 'Session invalide. Reconnectez-vous.'], 401);
        }

        $decoded = json_decode($request->getContent(), true);
        $data    = is_array($decoded) ? $decoded : []; // Protection : body non-objet JSON → tableau vide
        $role = $data['role'] ?? '';

        // M3 — un compte déjà actif ne peut pas repasser par l'onboarding
        if ($user->getStatus() === 'active') {
            return $this->json(['error' => 'Onboarding déjà complété.'], 409);
        }

        if (!in_array($role, ['owner', 'agency', 'candidate'], true)) {
            return $this->json(['error' => 'Rôle invalide. Valeurs : owner, agency, candidate.'], 422);
        }

        $roleConstant = match ($role) {
            'owner'     => 'ROLE_OWNER',
            'agency'    => 'ROLE_AGENCY',
            'candidate' => 'ROLE_CANDIDATE',
        };

        $user->setRoles([$roleConstant]);
        $user->setStatus('active');

        if ($role === 'owner') {
            // Propriétaire individuel : organisation personnelle implicite
            $orgName = trim((string) ($data['organizationName'] ?? ''))
                ?: trim($user->getFirstName() . ' ' . $user->getLastName());
            $org = new Organization($orgName, $role, $user->getId());
            $em->persist($org);
            $user->setOrganizationId($org->getId());
        }

        if ($role === 'agency') {
            // UNE agence = UNE organisation. Les agents REJOIGNENT — jamais
            // de « Prado Immo Lucas » recréée à chaque inscription (spec Wendy).
            $mode = (string) ($data['mode'] ?? 'create');

            if ($mode === 'join') {
                $token = (string) ($data['invitationToken'] ?? '');
                $inv   = $token !== ''
                    ? $em->getRepository(\App\Entity\OrganizationInvitation::class)->findOneBy(['token' => $token])
                    : null;
                if (!$inv || $inv->getAcceptedAt() !== null) {
                    return $this->json(['error' => ['code' => 'VALIDATION_ERROR', 'message' => 'Invitation introuvable ou déjà utilisée. Demandez un nouveau lien à votre agence.']], 422);
                }
                if ($inv->isExpired()) {
                    return $this->json(['error' => ['code' => 'INVITATION_EXPIRED', 'message' => 'Cette invitation a expiré — demandez-en une nouvelle.']], 422);
                }
                if (mb_strtolower($user->getEmail()) !== $inv->getEmail()) {
                    return $this->json(['error' => ['code' => 'FORBIDDEN', 'message' => 'Cette invitation est destinée à ' . $inv->getEmail() . '. Connectez-vous avec cette adresse.']], 403);
                }
                $em->persist(new \App\Entity\OrganizationMember($inv->getOrganizationId(), $user->getId(), $inv->getRole()));
                $inv->accept();
                $user->setOrganizationId($inv->getOrganizationId());
                $em->persist(new \App\Entity\AuditLog('organization', $inv->getOrganizationId(), 'member_joined', $user->getId(), $inv->getOrganizationId(), null, $inv->getRole()));
            } else {
                // Création : le nom de l'agence est OBLIGATOIRE (raison sociale, pas un prénom)
                $orgName = trim(strip_tags((string) ($data['organizationName'] ?? '')));
                if ($orgName === '' || mb_strlen($orgName) < 2) {
                    return $this->json(['error' => ['code' => 'VALIDATION_ERROR', 'message' => 'Le nom de votre agence est requis (ex : Prado Immo).']], 422);
                }
                $org = new Organization(mb_substr($orgName, 0, 120), $role, $user->getId());
                $em->persist($org);
                $user->setOrganizationId($org->getId());
                // Membre admin EXPLICITE (en plus de l'admin implicite créateur)
                $em->persist(new \App\Entity\OrganizationMember($org->getId(), $user->getId(), 'admin'));
            }
        }

        $em->flush();

        return $this->json([
            'id'             => $user->getId(),
            'email'          => $user->getEmail(),
            'firstName'      => $user->getFirstName(),
            'lastName'       => $user->getLastName(),
            'roles'          => $user->getRoles(),
            'status'         => $user->getStatus(),
            'organizationId' => $user->getOrganizationId(),
        ]);
    }
}
