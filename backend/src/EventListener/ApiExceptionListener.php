<?php
declare(strict_types=1);

namespace App\EventListener;

use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

/**
 * Erreurs API standardisées (spec) : toute exception NON catchée sur /api
 * devient {"error": {"code", "message"}} — jamais de stack trace exposée,
 * jamais de page HTML renvoyée à un client JSON.
 * Les réponses d'erreur construites par les controllers ne passent pas ici.
 */
#[AsEventListener(event: 'kernel.exception', priority: -10)]
final class ApiExceptionListener
{
    public function __invoke(ExceptionEvent $event): void
    {
        $request = $event->getRequest();
        if (!str_starts_with($request->getPathInfo(), '/api')) return;

        $e      = $event->getThrowable();
        $status = $e instanceof HttpExceptionInterface ? $e->getStatusCode() : 500;

        $code = match (true) {
            $status === 401 => 'UNAUTHORIZED',
            $status === 403 => 'FORBIDDEN',
            $status === 404 => 'RESOURCE_NOT_FOUND',
            $status === 405 => 'METHOD_NOT_ALLOWED',
            $status === 422 => 'VALIDATION_ERROR',
            $status === 429 => 'TOO_MANY_REQUESTS',
            default         => 'INTERNAL_ERROR',
        };
        $message = match ($code) {
            'UNAUTHORIZED'       => 'Authentification requise.',
            'FORBIDDEN'          => 'Accès refusé.',
            'RESOURCE_NOT_FOUND' => 'Ressource introuvable.',
            'METHOD_NOT_ALLOWED' => 'Méthode non autorisée.',
            'VALIDATION_ERROR'   => 'Données invalides.',
            'TOO_MANY_REQUESTS'  => 'Trop de tentatives — réessayez dans quelques minutes.',
            default              => 'Une erreur interne est survenue.',
        };

        $event->setResponse(new JsonResponse(
            ['error' => ['code' => $code, 'message' => $message]],
            $status
        ));
    }
}
