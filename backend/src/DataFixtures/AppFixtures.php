<?php
declare(strict_types=1);

namespace App\DataFixtures;

use App\Entity\Organization;
use App\Entity\User;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class AppFixtures extends Fixture
{
    public function __construct(private readonly UserPasswordHasherInterface $hasher) {}

    public function load(ObjectManager $manager): void
    {
        // Propriétaire de test
        $owner = new User();
        $owner->setEmail('marie.dupont@example.com')
              ->setFirstName('Marie')
              ->setLastName('Dupont')
              ->setRoles(['ROLE_OWNER'])
              ->setStatus('active')
              ->setPassword($this->hasher->hashPassword($owner, 'password123'));

        $org = new Organization('Immo Dupont', 'owner', $owner->getId());
        $owner->setOrganizationId($org->getId());
        $manager->persist($org);
        $manager->persist($owner);

        // Candidat de test
        $candidate = new User();
        $candidate->setEmail('lucas.martin@example.com')
                  ->setFirstName('Lucas')
                  ->setLastName('Martin')
                  ->setRoles(['ROLE_CANDIDATE'])
                  ->setStatus('active')
                  ->setPassword($this->hasher->hashPassword($candidate, 'password123'));
        $manager->persist($candidate);

        // Compte sans onboarding (pour tester le flux complet)
        $newUser = new User();
        $newUser->setEmail('nouveau@example.com')
                ->setFirstName('Nouveau')
                ->setLastName('Compte')
                ->setPassword($this->hasher->hashPassword($newUser, 'password123'));
        $manager->persist($newUser);

        $manager->flush();
    }
}
