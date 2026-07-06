<?php
declare(strict_types=1);

namespace App\Controller\Api;

use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Sonde de santé pour le déploiement (readiness/liveness probe).
 * Public, sans données sensibles.
 */
final class HealthController extends AbstractController
{
    #[Route('/api/health', methods: ['GET'])]
    public function health(EntityManagerInterface $em): JsonResponse
    {
        $db = true;
        try {
            $em->getConnection()->executeQuery('SELECT 1');
        } catch (\Throwable) {
            $db = false;
        }
        return $this->json(
            ['status' => $db ? 'ok' : 'degraded', 'database' => $db ? 'up' : 'down'],
            $db ? 200 : 503
        );
    }
}
