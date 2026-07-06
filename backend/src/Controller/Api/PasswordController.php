<?php
declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\PasswordResetToken;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/auth')]
final class PasswordController extends AbstractController
{
    public function __construct(private readonly RateLimiterFactory $forgotPasswordLimiter) {}

    /**
     * Envoie un lien de réinitialisation par email.
     * Réponse toujours identique pour éviter l'énumération d'emails.
     */
    #[Route('/forgot-password', methods: ['POST'])]
    public function forgotPassword(
        Request $request,
        EntityManagerInterface $em,
        MailerInterface $mailer
    ): JsonResponse {
        // Rate limiting : 5 demandes/heure par IP
        $limiter = $this->forgotPasswordLimiter->create($request->getClientIp() ?? 'unknown');
        if (!$limiter->consume(1)->isAccepted()) {
            $payload = ['message' => 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.'];
        // DEV UNIQUEMENT : MAILER_DSN=null://null n'envoie pas d'email,
        // on expose le lien pour pouvoir tester le parcours de bout en bout.
        if (($_ENV['APP_ENV'] ?? 'prod') === 'dev' && isset($resetUrl)) {
            $payload['devResetUrl'] = $resetUrl;
        }
        return $this->json($payload); // Même réponse pour ne pas confirmer le blocage
        }

        $decoded = json_decode($request->getContent(), true);
        $data    = is_array($decoded) ? $decoded : [];
        $email = strtolower(trim((string) ($data['email'] ?? '')));

        // Validation format email côté backend (ne rien révéler sur l'existence du compte)
        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            // Même réponse que si l'email n'existe pas (anti-énumération)
            return $this->json(['message' => 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.']);
        }

        $user = $em->getRepository(User::class)->findOneBy(['email' => $email]);

        if ($user) {
            // Invalider les anciens tokens de cet utilisateur
            $old = $em->getRepository(PasswordResetToken::class)->findBy(['userId' => $user->getId(), 'used' => false]);
            foreach ($old as $t) {
                $t->markUsed();
            }

            $resetToken = new PasswordResetToken($user->getId());
            $em->persist($resetToken);
            $em->flush();

            $resetUrl    = ($_ENV['FRONTEND_URL'] ?? 'http://localhost:4200') . '/reinitialiser-mot-de-passe?token=' . $resetToken->getToken();
            $firstName   = $user->getFirstName();

            $htmlBody = <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Réinitialisation mot de passe</title></head>
<body style="margin:0;padding:0;background:#F7F9F7;font-family:sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06);">
    <div style="background:#0E2A25;padding:32px 40px;text-align:center;">
      <p style="color:white;font-size:24px;font-weight:700;margin:0;letter-spacing:-0.5px;">BAILEO</p>
      <p style="color:#38B88A;font-size:13px;margin:4px 0 0;">Le workflow locatif</p>
    </div>
    <div style="padding:40px;">
      <p style="font-size:16px;color:#0E2A25;margin:0 0 8px;">Bonjour {$firstName},</p>
      <p style="font-size:15px;color:#4B5563;line-height:1.6;">Nous avons reçu une demande de réinitialisation de votre mot de passe Baileo.</p>
      <p style="font-size:15px;color:#4B5563;line-height:1.6;">Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe. Ce lien est valable <strong>1 heure</strong>.</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="{$resetUrl}" style="background:#0E2A25;color:white;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:600;font-size:15px;display:inline-block;">
          Réinitialiser mon mot de passe
        </a>
      </div>
      <p style="font-size:13px;color:#9CA3AF;line-height:1.6;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
      <p style="font-size:13px;color:#9CA3AF;">Lien direct : <a href="{$resetUrl}" style="color:#38B88A;">{$resetUrl}</a></p>
    </div>
    <div style="background:#F7F9F7;padding:20px 40px;text-align:center;">
      <p style="font-size:12px;color:#9CA3AF;margin:0;">© 2025 Baileo — Vos données sont protégées</p>
    </div>
  </div>
</body>
</html>
HTML;

            $mail = (new Email())
                ->from('noreply@baileo.app')
                ->to($user->getEmail())
                ->subject('Réinitialisation de votre mot de passe Baileo')
                ->html($htmlBody);

            try {
                $mailer->send($mail);
            } catch (\Throwable $e) {
                // Le token est déjà en base — l'utilisateur peut re-demander.
                // En prod : logger $e->getMessage() via un service de logging.
                // En dev : l'email est visible dans Mailpit (port 8025).
            }
        }

        $payload = ['message' => 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.'];
        // DEV UNIQUEMENT : MAILER_DSN=null://null n'envoie pas d'email,
        // on expose le lien pour pouvoir tester le parcours de bout en bout.
        if (($_ENV['APP_ENV'] ?? 'prod') === 'dev' && isset($resetUrl)) {
            $payload['devResetUrl'] = $resetUrl;
        }
        return $this->json($payload);
    }

    /**
     * Valide le token et réinitialise le mot de passe.
     */
    #[Route('/reset-password', methods: ['POST'])]
    public function resetPassword(
        Request $request,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $hasher
    ): JsonResponse {
        $decoded  = json_decode($request->getContent(), true);
        $data     = is_array($decoded) ? $decoded : [];
        $tokenStr = trim((string) ($data['token'] ?? ''));
        $password = (string) ($data['password'] ?? '');

        if (!$tokenStr) {
            return $this->json(['error' => 'Token manquant.'], 422);
        }
        if ($password === '') {
            return $this->json(['error' => 'Le mot de passe est requis.'], 422);
        }
        // Espaces en premier — message précis avant la vérification de longueur
        if (trim($password) === '') {
            return $this->json(['error' => "Le mot de passe ne peut pas être composé uniquement d'espaces."], 422);
        }
        if (mb_strlen($password) < 8) {
            return $this->json(['error' => 'Le mot de passe doit contenir au moins 8 caractères.'], 422);
        }

        $token = $em->getRepository(PasswordResetToken::class)->findOneBy(['token' => $tokenStr]);

        if (!$token || $token->isUsed() || $token->isExpired()) {
            return $this->json(['error' => 'Lien invalide ou expiré. Faites une nouvelle demande.'], 422);
        }

        $user = $em->getRepository(User::class)->find($token->getUserId());
        if (!$user) {
            return $this->json(['error' => 'Utilisateur introuvable.'], 404);
        }

        $user->setPassword($hasher->hashPassword($user, $password));
        $token->markUsed();
        $em->flush();

        return $this->json(['message' => 'Mot de passe réinitialisé avec succès.']);
    }

    /**
     * Vérifie qu'un token de réinitialisation est encore valide (utilisé par le frontend
     * pour afficher/masquer le formulaire).
     */
    #[Route('/verify-reset-token', methods: ['POST'])]
    public function verifyToken(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $decoded  = json_decode($request->getContent(), true);
        $data     = is_array($decoded) ? $decoded : [];
        $tokenStr = trim((string) ($data['token'] ?? ''));

        $token = $em->getRepository(PasswordResetToken::class)->findOneBy(['token' => $tokenStr]);
        $valid = $token && !$token->isUsed() && !$token->isExpired();

        return $this->json(['valid' => $valid]);
    }
}
