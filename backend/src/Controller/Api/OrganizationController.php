<?php
declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\AuditLog;
use App\Entity\Organization;
use App\Entity\OrganizationInvitation;
use App\Entity\OrganizationMember;
use App\Entity\User;
use App\Service\ActivityService;
use App\Service\OrganizationPermissionService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Gestion de l'organisation (agence) : profil, membres, invitations.
 * Toutes les permissions sont vérifiées SERVEUR (OrganizationPermissionService),
 * toutes les actions sensibles sont AUDITÉES (AuditLog).
 */
#[Route('/api')]
final class OrganizationController extends AbstractController
{
    public function __construct(
        private readonly OrganizationPermissionService $perms,
        private readonly ActivityService $activity,
    ) {}

    // ── GET /api/organizations/current — mon organisation + mon rôle ──
    #[Route('/organizations/current', methods: ['GET'])]
    public function current(EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user = $sec->getUser();
        $org  = $user->getOrganizationId()
            ? $em->getRepository(Organization::class)->find($user->getOrganizationId())
            : null;
        if (!$org) return $this->json(['error' => ['code' => 'RESOURCE_NOT_FOUND', 'message' => 'Aucune organisation.']], 404);

        return $this->json([
            'id'           => $org->getId(),
            'name'         => $org->getName(),
            'type'         => $org->getType(),
            'siret'        => $org->getSiret(),
            'address'      => $org->getAddress(),
            'city'         => $org->getCity(),
            'postalCode'   => $org->getPostalCode(),
            'billingEmail' => $org->getBillingEmail(),
            'myRole'       => $this->perms->roleOf($user, $org->getId()),
        ]);
    }

    // ── PATCH /api/organizations/{id} — admin only ──
    #[Route('/organizations/{id}', methods: ['PATCH'])]
    public function update(string $id, Request $request, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user = $sec->getUser();
        $org  = $em->getRepository(Organization::class)->find($id);
        if (!$org) return $this->json(['error' => ['code' => 'RESOURCE_NOT_FOUND', 'message' => 'Organisation introuvable.']], 404);
        if (!$this->perms->canAdminister($user, $org->getId())) {
            return $this->json(['error' => ['code' => 'ORGANIZATION_PERMISSION_DENIED', 'message' => 'Réservé aux administrateurs.']], 403);
        }

        $decoded = json_decode($request->getContent(), true);
        $data    = is_array($decoded) ? $decoded : [];
        if (isset($data['name'])) {
            $n = mb_substr(strip_tags(trim((string) $data['name'])), 0, 120);
            if ($n === '') return $this->json(['error' => ['code' => 'VALIDATION_ERROR', 'message' => 'Le nom est requis.']], 422);
            $org->setName($n);
        }
        if (array_key_exists('siret', $data))        $org->setSiret($data['siret']);
        if (array_key_exists('address', $data))      $org->setAddress($data['address']);
        if (array_key_exists('city', $data))         $org->setCity($data['city']);
        if (array_key_exists('postalCode', $data))   $org->setPostalCode($data['postalCode']);
        if (array_key_exists('billingEmail', $data)) $org->setBillingEmail($data['billingEmail']);
        $org->touch();

        $em->persist(new AuditLog('organization', $org->getId(), 'organization_updated', $user->getId(), $org->getId()));
        $em->flush();
        return $this->current($em, $sec);
    }

    // ── GET /api/organizations/{id}/members ──
    #[Route('/organizations/{id}/members', methods: ['GET'])]
    public function members(string $id, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user = $sec->getUser();
        if (!$this->perms->canView($user, $id)) {
            return $this->json(['error' => ['code' => 'ORGANIZATION_PERMISSION_DENIED', 'message' => 'Accès refusé.']], 403);
        }
        $org = $em->getRepository(Organization::class)->find($id);

        $rows = [];
        // Créateur = admin implicite
        if ($org) {
            $ownerUser = $em->getRepository(User::class)->find($org->getOwnerId());
            if ($ownerUser) {
                $rows[] = [
                    'id'       => 'owner',
                    'userId'   => $ownerUser->getId(),
                    'name'     => $ownerUser->getFirstName() . ' ' . $ownerUser->getLastName(),
                    'email'    => $ownerUser->getEmail(),
                    'role'     => 'admin',
                    'status'   => 'active',
                    'isOwner'  => true,
                    'joinedAt' => $org->getCreatedAt()->format('c'),
                ];
            }
        }
        foreach ($em->getRepository(OrganizationMember::class)->findBy(['organizationId' => $id]) as $m) {
            if ($org && $m->getUserId() === $org->getOwnerId()) continue; // créateur déjà listé
            $u = $em->getRepository(User::class)->find($m->getUserId());
            $rows[] = [
                'id'       => $m->getId(),
                'userId'   => $m->getUserId(),
                'name'     => $u ? $u->getFirstName() . ' ' . $u->getLastName() : 'Utilisateur',
                'email'    => $u?->getEmail(),
                'role'     => $m->getRole(),
                'status'   => $m->getStatus(),
                'isOwner'  => false,
                'joinedAt' => $m->getJoinedAt()?->format('c'),
            ];
        }
        // Invitations en attente
        $pending = $em->getRepository(OrganizationInvitation::class)->findBy(['organizationId' => $id, 'acceptedAt' => null]);
        $invitations = array_map(fn(OrganizationInvitation $i) => [
            'id'        => $i->getId(),
            'email'     => $i->getEmail(),
            'role'      => $i->getRole(),
            'expiresAt' => $i->getExpiresAt()->format('c'),
            'expired'   => $i->isExpired(),
            // Le lien d'invitation (en Phase 2, transmis manuellement — l'email viendra plus tard)
            'link'      => '/invitation/' . $i->getToken(),
        ], $pending);

        return $this->json(['data' => $rows, 'invitations' => $invitations]);
    }

    // ── POST /api/organizations/{id}/invitations — admin/manager ──
    #[Route('/organizations/{id}/invitations', methods: ['POST'])]
    public function invite(string $id, Request $request, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user = $sec->getUser();
        if (!$this->perms->canManage($user, $id)) {
            return $this->json(['error' => ['code' => 'ORGANIZATION_PERMISSION_DENIED', 'message' => 'Réservé aux administrateurs et managers.']], 403);
        }

        $decoded = json_decode($request->getContent(), true);
        $data    = is_array($decoded) ? $decoded : [];
        $email   = mb_strtolower(trim((string) ($data['email'] ?? '')));
        $role    = (string) ($data['role'] ?? 'agent');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->json(['error' => ['code' => 'VALIDATION_ERROR', 'message' => 'Email invalide.']], 422);
        }
        if (!in_array($role, OrganizationMember::ROLES, true)) {
            return $this->json(['error' => ['code' => 'VALIDATION_ERROR', 'message' => 'Rôle invalide.']], 422);
        }
        // Seul un admin peut inviter un admin
        if ($role === 'admin' && !$this->perms->canAdminister($user, $id)) {
            return $this->json(['error' => ['code' => 'ORGANIZATION_PERMISSION_DENIED', 'message' => 'Seul un administrateur peut inviter un administrateur.']], 403);
        }
        // Déjà membre ?
        $existing = $em->getRepository(User::class)->findOneBy(['email' => $email]);
        if ($existing) {
            $already = $em->getRepository(OrganizationMember::class)->findOneBy(['organizationId' => $id, 'userId' => $existing->getId()]);
            if ($already) return $this->json(['error' => ['code' => 'VALIDATION_ERROR', 'message' => 'Cette personne est déjà membre.']], 422);
        }

        $inv = new OrganizationInvitation($id, $email, $role, $user->getId());
        $em->persist($inv);
        $em->persist(new AuditLog('organization', $id, 'member_invited', $user->getId(), $id, null, $email . ' (' . $role . ')'));
        $em->flush();

        return $this->json([
            'id'    => $inv->getId(),
            'email' => $inv->getEmail(),
            'role'  => $inv->getRole(),
            'link'  => '/invitation/' . $inv->getToken(),
        ], 201);
    }

    // ── POST /api/organization-invitations/{token}/accept — l'invité (connecté) rejoint ──
    #[Route('/organization-invitations/{token}/accept', methods: ['POST'])]
    public function accept(string $token, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user = $sec->getUser();
        $inv  = $em->getRepository(OrganizationInvitation::class)->findOneBy(['token' => $token]);
        if (!$inv || $inv->getAcceptedAt() !== null) {
            return $this->json(['error' => ['code' => 'RESOURCE_NOT_FOUND', 'message' => 'Invitation introuvable ou déjà utilisée.']], 404);
        }
        if ($inv->isExpired()) {
            return $this->json(['error' => ['code' => 'VALIDATION_ERROR', 'message' => 'Invitation expirée — demandez-en une nouvelle.']], 422);
        }
        if (mb_strtolower($user->getEmail()) !== $inv->getEmail()) {
            return $this->json(['error' => ['code' => 'FORBIDDEN', 'message' => 'Cette invitation est destinée à ' . $inv->getEmail() . '.']], 403);
        }

        $member = new OrganizationMember($inv->getOrganizationId(), $user->getId(), $inv->getRole());
        $em->persist($member);
        $inv->accept();
        // Rattacher l'utilisateur à l'organisation (contexte unique en Phase 2)
        $user->setOrganizationId($inv->getOrganizationId());
        if (!in_array('ROLE_AGENCY', $user->getRoles(), true)) {
            $user->setRoles(array_values(array_unique([...$user->getRoles(), 'ROLE_AGENCY'])));
        }
        // Compte créé via le lien d'invitation : l'acceptation VAUT onboarding
        if ($user->getStatus() === 'pending') {
            $user->setStatus('active');
        }
        $em->persist(new AuditLog('organization', $inv->getOrganizationId(), 'member_joined', $user->getId(), $inv->getOrganizationId(), null, $inv->getRole()));
        $em->flush();

        return $this->json(['organizationId' => $inv->getOrganizationId(), 'role' => $inv->getRole()]);
    }

    // ── PATCH /api/organizations/{id}/members/{memberId} — rôle/statut (admin) ──
    #[Route('/organizations/{id}/members/{memberId}', methods: ['PATCH'])]
    public function updateMember(string $id, string $memberId, Request $request, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user = $sec->getUser();
        if (!$this->perms->canAdminister($user, $id)) {
            return $this->json(['error' => ['code' => 'ORGANIZATION_PERMISSION_DENIED', 'message' => 'Réservé aux administrateurs.']], 403);
        }
        $member = $em->getRepository(OrganizationMember::class)->find($memberId);
        if (!$member || $member->getOrganizationId() !== $id) {
            return $this->json(['error' => ['code' => 'RESOURCE_NOT_FOUND', 'message' => 'Membre introuvable.']], 404);
        }

        $decoded = json_decode($request->getContent(), true);
        $data    = is_array($decoded) ? $decoded : [];
        // Intégrité : impossible de rétrograder/suspendre le DERNIER admin actif
        $wouldLoseAdmin = ($member->getRole() === 'admin')
            && ((isset($data['role']) && $data['role'] !== 'admin')
                || (isset($data['status']) && $data['status'] !== 'active'));
        if ($wouldLoseAdmin && $this->countActiveAdmins($id, $em) <= 1) {
            return $this->json(['error' => ['code' => 'VALIDATION_ERROR', 'message' => 'Impossible : l\'organisation doit conserver au moins un administrateur actif.']], 422);
        }
        $old     = $member->getRole() . '/' . $member->getStatus();
        if (isset($data['role']))   $member->setRole((string) $data['role']);
        if (isset($data['status'])) $member->setStatus((string) $data['status']);

        $em->persist(new AuditLog('organization_member', $member->getId(), 'member_updated', $user->getId(), $id, $old, $member->getRole() . '/' . $member->getStatus()));
        $em->flush();
        return $this->json(['id' => $member->getId(), 'role' => $member->getRole(), 'status' => $member->getStatus()]);
    }

    // ── DELETE /api/organizations/{id}/members/{memberId} — admin ──
    #[Route('/organizations/{id}/members/{memberId}', methods: ['DELETE'])]
    public function removeMember(string $id, string $memberId, EntityManagerInterface $em, Security $sec): JsonResponse
    {
        /** @var User $user */
        $user = $sec->getUser();
        if (!$this->perms->canAdminister($user, $id)) {
            return $this->json(['error' => ['code' => 'ORGANIZATION_PERMISSION_DENIED', 'message' => 'Réservé aux administrateurs.']], 403);
        }
        $member = $em->getRepository(OrganizationMember::class)->find($memberId);
        if (!$member || $member->getOrganizationId() !== $id) {
            return $this->json(['error' => ['code' => 'RESOURCE_NOT_FOUND', 'message' => 'Membre introuvable.']], 404);
        }
        if ($member->getRole() === 'admin' && $this->countActiveAdmins($id, $em) <= 1) {
            return $this->json(['error' => ['code' => 'VALIDATION_ERROR', 'message' => 'Impossible de retirer le dernier administrateur de l\'organisation.']], 422);
        }
        // Détacher l'utilisateur de l'organisation
        $u = $em->getRepository(User::class)->find($member->getUserId());
        if ($u && $u->getOrganizationId() === $id) $u->setOrganizationId(null);

        $em->persist(new AuditLog('organization_member', $member->getId(), 'member_removed', $user->getId(), $id, $member->getRole(), null));
        $em->remove($member);
        $em->flush();
        return $this->json(['removed' => true]);
    }

    /** Admins actifs = créateur (admin implicite) + membres admin actifs (dédupliqués). */
    private function countActiveAdmins(string $orgId, EntityManagerInterface $em): int
    {
        $org = $em->getRepository(Organization::class)->find($orgId);
        $ids = $org ? [$org->getOwnerId()] : [];
        foreach ($em->getRepository(OrganizationMember::class)->findBy(['organizationId' => $orgId, 'role' => 'admin', 'status' => 'active']) as $m) {
            $ids[] = $m->getUserId();
        }
        return count(array_unique($ids));
    }
}
