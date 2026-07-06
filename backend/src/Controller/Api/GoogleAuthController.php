<?php
declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/auth/google')]
final class GoogleAuthController extends AbstractController
{
    /** Lit une variable d'env via toutes les sources possibles */
    private function env(string $name, string $default = ''): string
    {
        // 1. Variable process (Docker env inject)
        $val = getenv($name);
        if ($val !== false && $val !== '') return $val;

        // 2. $_ENV (Symfony DotEnv)
        if (!empty($_ENV[$name])) return $_ENV[$name];

        // 3. $_SERVER (PHP-FPM env)
        if (!empty($_SERVER[$name])) return $_SERVER[$name];

        return $default;
    }

    #[Route('/redirect', name: 'google_redirect', methods: ['GET'])]
    public function redirectToGoogle(Request $request): Response
    {
        $clientId    = $this->env('GOOGLE_CLIENT_ID');
        $redirectUri = $this->env('BACKEND_URL', 'http://localhost:8000') . '/api/auth/google/callback';

        if (empty($clientId)) {
            return new RedirectResponse(
                $this->env('FRONTEND_URL', 'http://localhost:4200') .
                '/connexion?error=google_not_configured'
            );
        }

        // Retour post-connexion (ex: page de dépôt de dossier) — chemins internes uniquement
        $redirect = (string) $request->query->get('redirect', '');
        if ($redirect === '' || !str_starts_with($redirect, '/') || str_starts_with($redirect, '//')) {
            $redirect = '';
        }

        $nonce       = bin2hex(random_bytes(16));
        $payload     = $nonce . '|' . base64_encode($redirect);
        $secret      = $this->env('APP_SECRET', 'fallback');
        $signedState = base64_encode($payload) . '.' . hash_hmac('sha256', $payload, $secret);

        $params = http_build_query([
            'client_id'     => $clientId,
            'redirect_uri'  => $redirectUri,
            'response_type' => 'code',
            'scope'         => 'openid email profile',
            'state'         => $signedState,
            'access_type'   => 'online',
            'prompt'        => 'select_account',
        ]);

        return new RedirectResponse('https://accounts.google.com/o/oauth2/v2/auth?' . $params);
    }

    #[Route('/callback', name: 'google_callback', methods: ['GET'])]
    public function callback(
        Request $request,
        EntityManagerInterface $em,
        JWTTokenManagerInterface $jwtManager,
        UserPasswordHasherInterface $hasher
    ): Response {
        $frontendUrl = $this->env('FRONTEND_URL', 'http://localhost:4200');
        $code        = $request->query->get('code', '');
        $state       = $request->query->get('state', '');
        $error       = $request->query->get('error', '');

        if ($error || !$code) {
            return new RedirectResponse($frontendUrl . '/connexion?error=google_cancelled');
        }

        $parts  = explode('.', $state, 2);
        $secret = $this->env('APP_SECRET', 'fallback');
        $payload = count($parts) === 2 ? base64_decode($parts[0], true) : false;
        if ($payload === false || !hash_equals(hash_hmac('sha256', $payload, $secret), $parts[1])) {
            return new RedirectResponse($frontendUrl . '/connexion?error=invalid_state');
        }
        // Extraire le retour demandé (validé à l'aller, revalidé ici)
        $stateRedirect = '';
        $pp = explode('|', $payload, 2);
        if (count($pp) === 2) {
            $decoded = base64_decode($pp[1], true);
            if ($decoded !== false && str_starts_with($decoded, '/') && !str_starts_with($decoded, '//')) {
                $stateRedirect = $decoded;
            }
        }

        $redirectUri  = $this->env('BACKEND_URL', 'http://localhost:8000') . '/api/auth/google/callback';
        $clientId     = $this->env('GOOGLE_CLIENT_ID');
        $clientSecret = $this->env('GOOGLE_CLIENT_SECRET');

        $context = stream_context_create([
            'http' => [
                'method'  => 'POST',
                'header'  => 'Content-Type: application/x-www-form-urlencoded',
                'content' => http_build_query([
                    'code'          => $code,
                    'client_id'     => $clientId,
                    'client_secret' => $clientSecret,
                    'redirect_uri'  => $redirectUri,
                    'grant_type'    => 'authorization_code',
                ]),
                'ignore_errors' => true,
            ],
        ]);

        $tokenResponse = @file_get_contents('https://oauth2.googleapis.com/token', false, $context);
        if (!$tokenResponse) {
            return new RedirectResponse($frontendUrl . '/connexion?error=google_token_failed');
        }

        $tokenData   = json_decode($tokenResponse, true);
        $accessToken = $tokenData['access_token'] ?? '';

        if (!$accessToken) {
            return new RedirectResponse($frontendUrl . '/connexion?error=google_token_failed');
        }

        $ctx      = stream_context_create(['http' => ['header' => 'Authorization: Bearer ' . $accessToken, 'ignore_errors' => true]]);
        $infoJson = @file_get_contents('https://www.googleapis.com/oauth2/v2/userinfo', false, $ctx);
        $userInfo = ($infoJson && is_array($decoded = json_decode($infoJson, true))) ? $decoded : [];

        $googleEmail = strtolower(trim($userInfo['email'] ?? ''));

        if (!$googleEmail) {
            return new RedirectResponse($frontendUrl . '/connexion?error=google_no_email');
        }

        $user = $em->getRepository(User::class)->findOneBy(['email' => $googleEmail]);
        if (!$user) {
            $rawFirst  = trim((string) ($userInfo['given_name'] ?? ''));
            $firstName = $rawFirst !== '' ? $rawFirst : explode('@', $googleEmail)[0];
            $firstName = mb_substr($firstName, 0, 100);
            $lastName  = mb_substr(trim((string) ($userInfo['family_name'] ?? '')), 0, 100);

            $user = new User();
            $user->setEmail($googleEmail)
                 ->setFirstName($firstName)
                 ->setLastName($lastName)
                 ->setPassword($hasher->hashPassword($user, bin2hex(random_bytes(24))));
            $em->persist($user);

            try {
                $em->flush();
            } catch (\Doctrine\DBAL\Exception\UniqueConstraintViolationException $e) {
                $em->clear();
                $user = $em->getRepository(User::class)->findOneBy(['email' => $googleEmail]);
                if (!$user) {
                    return new RedirectResponse($frontendUrl . '/connexion?error=google_token_failed');
                }
            }
        }

        $jwt          = $jwtManager->create($user);
        $redirectPath = $user->getStatus() === 'pending'
            ? '/onboarding' . ($stateRedirect ? '?redirect=' . urlencode($stateRedirect) : '')
            : ($stateRedirect ?: '/tableau-de-bord');

        return new RedirectResponse(
            $frontendUrl . '/auth/google/success#token=' . urlencode($jwt) . '&to=' . urlencode($redirectPath)
        );
    }
}
