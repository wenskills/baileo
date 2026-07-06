<?php
declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/auth')]
final class AuthController extends AbstractController
{
    public function __construct(private readonly RateLimiterFactory $registerLimiter) {}

    #[Route('/register', methods: ['POST'])]
    public function register(
        Request $request,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $hasher
    ): JsonResponse {
        // Rate limiting : 10 inscriptions/heure par IP
        $limiter = $this->registerLimiter->create($request->getClientIp() ?? 'unknown');
        if (!$limiter->consume(1)->isAccepted()) {
            return $this->json(['error' => 'Trop de tentatives. Réessayez plus tard.'], 429);
        }

        $decoded = json_decode($request->getContent(), true);
        $data    = is_array($decoded) ? $decoded : []; // Protection : body non-objet JSON → tableau vide

        $email    = strtolower(trim((string) ($data['email']     ?? '')));
        $password = (string) ($data['password']   ?? '');
        $first    = trim((string) ($data['firstName'] ?? ''));
        $last     = trim((string) ($data['lastName']  ?? ''));

        if (!$email || !$password || !$first) {
            return $this->json(['error' => 'Les champs email, mot de passe et prénom sont requis.'], 422);
        }
        if (mb_strlen($email) > 180) {
            return $this->json(['error' => 'Adresse email trop longue (max 180 caractères).'], 422);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->json(['error' => 'Adresse email invalide. Vérifiez le format (exemple@domaine.com).'], 422);
        }
        // Vérification espaces AVANT longueur pour un message précis
        if (trim($password) === '') {
            return $this->json(['error' => "Le mot de passe ne peut pas être vide ou composé uniquement d'espaces."], 422);
        }
        if (mb_strlen($password) < 8) {
            return $this->json(['error' => 'Le mot de passe doit contenir au moins 8 caractères.'], 422);
        }
        if (mb_strlen($first) > 100) {
            return $this->json(['error' => 'Le prénom ne peut pas dépasser 100 caractères.'], 422);
        }
        if (mb_strlen($last) > 100) {
            return $this->json(['error' => 'Le nom ne peut pas dépasser 100 caractères.'], 422);
        }
        if ($em->getRepository(User::class)->findOneBy(['email' => $email])) { // $email déjà strtolower'd
            // M4 — message volontairement générique pour ne pas confirmer l'existence
            // d'un compte à un tiers (protection contre l'énumération d'emails)
            return $this->json(['error' => 'Impossible de créer ce compte. Si vous avez déjà un compte, connectez-vous.'], 409);
        }

        $user = new User();
        $user->setEmail($email)
             ->setFirstName($first)
             ->setLastName($last)
             ->setPassword($hasher->hashPassword($user, $password));

        $em->persist($user);

        try {
            $em->flush();
        } catch (UniqueConstraintViolationException) {
            // Race condition : deux inscriptions simultanées avec le même email
            return $this->json(['error' => 'Impossible de créer ce compte. Si vous avez déjà un compte, connectez-vous.'], 409);
        }

        return $this->json($this->serialize($user), 201);
    }

    #[Route('/me', methods: ['GET'])]
    public function me(Security $security): JsonResponse
    {
        /** @var User|null $user */
        $user = $security->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Non authentifié'], 401);
        }

        return $this->json($this->serialize($user));
    }

    /**
     * PATCH /api/auth/profile — l'utilisateur gère les infos qu'il rend publiques.
     * RGPD : la bio est le SEUL champ exposé publiquement en plus de
     * (prénom + initiale, ancienneté, nb d'annonces actives).
     */
    #[Route('/profile', methods: ['PATCH'])]
    public function updateProfile(Request $request, EntityManagerInterface $em, Security $security): JsonResponse
    {
        /** @var User|null $user */
        $user = $security->getUser();
        if (!$user instanceof User) return $this->json(['error' => 'Non authentifié'], 401);

        $decoded = json_decode($request->getContent(), true);
        $data    = is_array($decoded) ? $decoded : [];

        if (array_key_exists('publicBio', $data)) {
            $bio = (string) $data['publicBio'];
            if (mb_strlen($bio) > 600) return $this->json(['error' => 'La bio ne peut pas dépasser 600 caractères.'], 422);
            $user->setPublicBio($bio ?: null);
        }
        if (isset($data['firstName'])) {
            $f = trim((string) $data['firstName']);
            if (!$f || mb_strlen($f) > 100) return $this->json(['error' => 'Prénom invalide.'], 422);
            $user->setFirstName($f);
        }
        if (isset($data['lastName'])) {
            $l = trim((string) $data['lastName']);
            if (mb_strlen($l) > 100) return $this->json(['error' => 'Nom invalide.'], 422);
            $user->setLastName($l);
        }

        $em->flush();
        return $this->json($this->serialize($user));
    }

    /**
     * GET /api/auth/export — droit à la portabilité (RGPD art. 20).
     * L'utilisateur télécharge TOUTES ses données au format JSON.
     */
    #[Route('/export', methods: ['GET'])]
    public function exportData(EntityManagerInterface $em, Security $security): JsonResponse
    {
        /** @var User|null $user */
        $user = $security->getUser();
        if (!$user instanceof User) return $this->json(['error' => 'Non authentifié'], 401);
        $uid = $user->getId();

        $export = [
            'exportedAt' => (new \DateTimeImmutable())->format('c'),
            'notice'     => 'Export de vos données personnelles Baileo (RGPD, article 20 — droit à la portabilité).',
            'profile'    => $this->serialize($user),
        ];

        // Passport (candidat)
        $passport = $em->getRepository(\App\Entity\RentalPassport::class)->findOneBy(['userId' => $uid]);
        if ($passport) {
            $export['rentalPassport'] = [
                'completionRate' => $passport->getCompletionRate(),
                'documents'      => array_map(fn($d) => [
                    'type' => $d['type'] ?? '', 'name' => $d['name'] ?? '',
                    'uploadedAt' => $d['uploadedAt'] ?? null, 'status' => $d['status'] ?? 'uploaded',
                ], $passport->getDocuments()),
            ];
        }

        // Candidatures (candidat) / campagnes (propriétaire)
        $export['applications'] = array_map(fn($a) => [
            'campaignId' => $a->getCampaignId(), 'status' => $a->getStatus(),
            'createdAt' => $a->getCreatedAt()->format('c'),
        ], $em->getRepository(\App\Entity\Application::class)->findBy(['candidateId' => $uid]));

        $export['campaigns'] = array_map(fn($c) => [
            'id' => $c->getId(), 'title' => $c->getTitle(), 'status' => $c->getStatus(),
            'createdAt' => $c->getCreatedAt()->format('c'),
        ], $em->getRepository(\App\Entity\Campaign::class)->findBy(['ownerId' => $uid]));

        // Messages ENVOYÉS par l'utilisateur (ses données à lui — pas celles des autres)
        $export['messagesSent'] = array_map(fn($m) => [
            'content' => $m->getContent(), 'createdAt' => $m->getCreatedAt()->format('c'),
        ], $em->getRepository(\App\Entity\Message::class)->findBy(['senderId' => $uid], ['createdAt' => 'ASC'], 500));

        // Notifications reçues
        $export['notifications'] = array_map(fn($n) => [
            'title' => $n->getTitle(), 'body' => $n->getBody(),
            'createdAt' => $n->getCreatedAt()->format('c'),
        ], $em->getRepository(\App\Entity\Notification::class)->findBy(['userId' => $uid], ['createdAt' => 'DESC'], 500));

        return $this->json($export);
    }

    private function serialize(User $u): array
    {
        return [
            'id'             => $u->getId(),
            'email'          => $u->getEmail(),
            'firstName'      => $u->getFirstName(),
            'lastName'       => $u->getLastName(),
            'roles'          => $u->getRoles(),
            'status'         => $u->getStatus(),
            'organizationId' => $u->getOrganizationId(),
            'publicBio'      => $u->getPublicBio(),
        ];
    }
}
