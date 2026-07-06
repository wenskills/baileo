<?php
declare(strict_types=1);

namespace App\Service;

use App\Entity\Organization;
use App\Entity\OrganizationMember;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Juge UNIQUE des permissions d'organisation (spec : « permissions backend
 * obligatoires — ne jamais se contenter de cacher les boutons »).
 *
 * Hiérarchie : admin > manager > agent > viewer.
 *  - admin   : tout (membres, rôles, organisation, décisions)
 *  - manager : campagnes, assignations, décisions
 *  - agent   : traiter les dossiers (messages, documents, visites)
 *  - viewer  : lecture seule
 * Le créateur de l'organisation (ownerId) est admin implicite.
 */
final class OrganizationPermissionService
{
    private const LEVEL = ['viewer' => 1, 'agent' => 2, 'manager' => 3, 'admin' => 4];

    public function __construct(private readonly EntityManagerInterface $em) {}

    /** Rôle effectif de l'utilisateur dans l'organisation, ou null s'il n'en est pas membre actif. */
    public function roleOf(User $user, string $organizationId): ?string
    {
        $org = $this->em->getRepository(Organization::class)->find($organizationId);
        if (!$org) return null;
        if ($org->getOwnerId() === $user->getId()) return 'admin';

        $member = $this->em->getRepository(OrganizationMember::class)->findOneBy([
            'organizationId' => $organizationId, 'userId' => $user->getId(),
        ]);
        return ($member && $member->isActive()) ? $member->getRole() : null;
    }

    public function hasAtLeast(User $user, string $organizationId, string $minRole): bool
    {
        $role = $this->roleOf($user, $organizationId);
        return $role !== null
            && (self::LEVEL[$role] ?? 0) >= (self::LEVEL[$minRole] ?? 99);
    }

    public function canView(User $user, string $orgId): bool          { return $this->hasAtLeast($user, $orgId, 'viewer'); }
    public function canProcess(User $user, string $orgId): bool       { return $this->hasAtLeast($user, $orgId, 'agent'); }
    public function canManage(User $user, string $orgId): bool        { return $this->hasAtLeast($user, $orgId, 'manager'); }
    public function canAdminister(User $user, string $orgId): bool    { return $this->hasAtLeast($user, $orgId, 'admin'); }
}
