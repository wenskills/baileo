<?php
declare(strict_types=1);

namespace App\Service;

use App\Entity\Application;
use App\Entity\Campaign;
use App\Entity\RentalPassport;

/**
 * Service de scoring de compatibilité candidat/logement.
 *
 * Algorithme transparent (conforme au RGPD — explicabilité obligatoire) :
 *
 * | Critère                | Poids | Description                              |
 * |------------------------|-------|------------------------------------------|
 * | Stabilité professionnelle | 20  | Type de contrat + ancienneté             |
 * | Revenus / solvabilité  | 20    | Ratio revenus/loyer charges comprises    |
 * | Garanties              | 15    | Présence et solidité du garant           |
 * | Dossier & documents    | 20    | Complétude et qualité du dossier         |
 * | Projet & disponibilité | 15    | Adéquation au logement                   |
 * | Réactivité             | 10    | Rapidité de réponse (simulé en MVP)      |
 *
 * Total : 100 points
 */
final class ScoringService
{
    /**
     * Calcule le score et met à jour l'Application.
     * Retourne le score /100.
     */
    public function score(Application $app, RentalPassport $passport, Campaign $campaign): int
    {
        $breakdown = [];

        // ── 1. Stabilité professionnelle (20 pts) ────────────────────
        $proScore = $this->scoreEmployment($passport->getContractType(), $passport->getEmploymentDuration());
        $breakdown['professional_stability'] = [
            'label'   => 'Stabilité professionnelle',
            'weight'  => 20,
            'score'   => $proScore,
            'max'     => 20,
            'reason'  => $this->employmentReason($passport->getContractType()),
        ];

        // ── 2. Revenus / solvabilité (20 pts) ────────────────────────
        $totalRent = $campaign->getRent() + $campaign->getCharges();
        $income    = $passport->getMonthlyIncome() ?? 0;
        $incScore  = $this->scoreIncome($income, $totalRent);
        $ratio     = $totalRent > 0 ? round($income / $totalRent, 1) : 0;
        $breakdown['income'] = [
            'label'   => 'Revenus & solvabilité',
            'weight'  => 20,
            'score'   => $incScore,
            'max'     => 20,
            'reason'  => sprintf('Revenus %.0f € / loyer cc %.0f € = ratio %.1fx', $income, $totalRent, $ratio),
        ];

        // ── 3. Garanties (15 pts) ────────────────────────────────────
        $guarScore = $this->scoreGuarantor($passport->getGuarantorRelation(), $passport->getGuarantorIncome() ?? 0, $totalRent);
        $breakdown['guarantor'] = [
            'label'   => 'Garant & cautions',
            'weight'  => 15,
            'score'   => $guarScore,
            'max'     => 15,
            'reason'  => $passport->getGuarantorRelation() !== 'none'
                ? sprintf('Garant (%s) revenus %.0f €', $passport->getGuarantorRelation(), $passport->getGuarantorIncome() ?? 0)
                : 'Aucun garant déclaré',
        ];

        // ── 4. Dossier & documents (20 pts) ──────────────────────────
        $docScore = $this->scoreDossier($passport->getCompletionRate(), count($passport->getDocuments()));
        $breakdown['dossier'] = [
            'label'   => 'Dossier & documents',
            'weight'  => 20,
            'score'   => $docScore,
            'max'     => 20,
            'reason'  => sprintf('Dossier complété à %d%% (%d pièces)', $passport->getCompletionRate(), count($passport->getDocuments())),
        ];

        // ── 5. Projet & disponibilité (15 pts) ───────────────────────
        $projScore = $this->scoreProject(
            $passport->getAvailabilityDate(),
            $campaign->getAvailableAt(),
            $passport->getProjectDuration()
        );
        $breakdown['project'] = [
            'label'   => 'Projet & disponibilité',
            'weight'  => 15,
            'score'   => $projScore,
            'max'     => 15,
            'reason'  => 'Disponibilité et projet locatif',
        ];

        // ── 6. Réactivité (10 pts) ───────────────────────────────────
        // En MVP : score de base 8/10 (simulé — sera réel avec suivi temps de réponse)
        $reacScore = 8;
        $breakdown['reactivity'] = [
            'label'  => 'Réactivité',
            'weight' => 10,
            'score'  => $reacScore,
            'max'    => 10,
            'reason' => 'Score de réactivité moyen attribué par défaut',
        ];

        $total = $proScore + $incScore + $guarScore + $docScore + $projScore + $reacScore;
        $total = max(0, min(100, $total));

        $app->setScore($total);
        // Convertir en tableau indexé pour que le frontend puisse itérer (@for)
        $app->setScoreBreakdown(array_values($breakdown));

        // Mettre à jour le cachedScore sur le passport pour l'affichage candidat
        $passport->setCachedScore($total);
        $passport->touch();

        return $total;
    }

    // ── Méthodes privées ──────────────────────────────────────────────

    private function scoreEmployment(string $contractType, string $duration): int
    {
        $base = match($contractType) {
            'cdi'        => 18,
            'retired'    => 17,
            'freelance'  => 13,
            'cdd'        => 11,
            'student'    => 7,
            'unemployed' => 3,
            ''           => 0,  // passport non rempli → score neutre
            default      => 5,
        };

        // Bonus ancienneté pour CDI
        if ($contractType === 'cdi' && str_contains($duration, 'an')) {
            preg_match('/(\d+)\s*an/', $duration, $m);
            $years = (int) ($m[1] ?? 0);
            if ($years >= 3) $base = min(20, $base + 2);
        }

        return $base;
    }

    private function employmentReason(string $type): string
    {
        return match($type) {
            'cdi'       => 'CDI — stabilité optimale',
            'cdd'       => 'CDD — stabilité limitée dans le temps',
            'freelance' => 'Indépendant — revenus variables',
            'student'   => 'Étudiant — garant généralement requis',
            'retired'   => 'Retraité — revenus stables et prévisibles',
            'unemployed'=> 'Sans emploi — dossier à renforcer',
            default     => 'Situation professionnelle à préciser',
        };
    }

    private function scoreIncome(float $income, float $totalRent): int
    {
        if ($totalRent <= 0 || $income <= 0) return 0;

        $ratio = $income / $totalRent;

        return match(true) {
            $ratio >= 4.0 => 20,
            $ratio >= 3.5 => 18,
            $ratio >= 3.0 => 16,
            $ratio >= 2.5 => 12,
            $ratio >= 2.0 => 8,
            $ratio >= 1.5 => 4,
            default       => 2,
        };
    }

    private function scoreGuarantor(string $relation, float $guarantorIncome, float $totalRent): int
    {
        if ($relation === 'none' || $guarantorIncome <= 0) return 0;

        $ratio = $totalRent > 0 ? $guarantorIncome / $totalRent : 0;

        return match(true) {
            $ratio >= 5  => 15,
            $ratio >= 4  => 13,
            $ratio >= 3  => 10,
            $ratio >= 2  => 7,
            default      => 4,
        };
    }

    private function scoreDossier(int $completionRate, int $docCount): int
    {
        // 15 pts pour la complétude, 5 pts pour le nombre de docs
        $completionScore = (int) round($completionRate / 100 * 15);
        $docScore        = match(true) {
            $docCount >= 6 => 5,
            $docCount >= 4 => 3,
            $docCount >= 2 => 1,
            default        => 0,
        };

        return $completionScore + $docScore;
    }

    private function scoreProject(?string $candidateDate, ?\DateTimeImmutable $campaignDate, ?string $duration): int
    {
        $score = 10; // base

        // Vérifier la cohérence des dates
        if ($candidateDate && $campaignDate) {
            try {
                $cd         = new \DateTimeImmutable($candidateDate);
                $diffObj    = $cd->diff($campaignDate);
                $days       = (int) $diffObj->days;
                // $diffObj->invert = 1 si $cd > $campaignDate (candidat dispo APRÈS la campagne)
                // $diffObj->invert = 0 si $cd <= $campaignDate (candidat dispo AVANT ou même jour — idéal)

                if ($diffObj->invert === 0) {
                    // Candidat disponible AVANT ou en même temps → bonus
                    if ($days <= 30) $score += 5;       // très proche (pré-disponible ou juste à temps)
                    elseif ($days <= 90) $score += 3;   // disponible tôt, logique
                    elseif ($days <= 180) $score += 1;  // disponible bien avant
                    // sinon: neutre (trop en avance, projet peut changer)
                } else {
                    // Candidat disponible APRÈS la campagne → pénalité selon le décalage
                    if ($days <= 30) $score += 1;       // léger décalage tolérable
                    elseif ($days <= 60) $score -= 2;   // décalage notable
                    else $score -= 4;                   // décalage important
                }
            } catch (\Throwable) {}
        }

        // Bonus projet long terme
        if ($duration === 'long_term') $score += 2;

        return max(0, min(15, $score));
    }

    /**
     * Génère un label lisible pour le score.
     */
    public static function scoreLabel(int $score): string
    {
        return match(true) {
            $score >= 85 => 'Très compatible',
            $score >= 70 => 'Compatible',
            $score >= 55 => 'À étudier',
            $score >= 40 => 'À compléter',
            default      => 'Incompatible',
        };
    }

    /**
     * Couleur associée au score.
     */
    public static function scoreColor(int $score): string
    {
        return match(true) {
            $score >= 85 => '#2C7A5E',
            $score >= 70 => '#3B82F6',
            $score >= 55 => '#F97316',
            $score >= 40 => '#EAB308',
            default      => '#EF4444',
        };
    }
}
