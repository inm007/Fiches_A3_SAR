<?php

namespace App\Services;

/**
 * Formules du PRD §6.2. Les écrans, tableaux de bord et exports appellent cette classe.
 * Une valeur null signifie « Non calculable » (dénominateur nul ou donnée absente).
 */
class Calculs
{
    public function ecart(?float $mesuree, ?float $reference): ?float
    {
        if ($mesuree === null || $reference === null) {
            return null;
        }

        return round($mesuree - $reference, 4);
    }

    /**
     * Amélioration (%) = (après − avant) / avant × 100 × s, s = +1 (hausse) ou −1 (baisse).
     */
    public function ameliorationPourcent(?float $avant, ?float $apres, string $sens): ?float
    {
        if ($avant === null || $apres === null || $avant == 0.0) {
            return null;
        }

        $signe = $sens === 'baisse' ? -1 : 1;

        return round(($apres - $avant) / $avant * 100 * $signe, 2);
    }

    /**
     * Le résultat tient la cible : au moins la cible si la hausse est souhaitée, au plus si
     * c'est la baisse. Null quand la valeur ou la cible manque (« Non calculable »).
     */
    public function cibleTenue(?float $valeur, ?float $cible, string $sens): ?bool
    {
        if ($valeur === null || $cible === null) {
            return null;
        }

        return $sens === 'baisse' ? $valeur <= $cible : $valeur >= $cible;
    }

    /**
     * Un indicateur à ne pas dégrader s'est dégradé : il a reculé par rapport à sa valeur
     * avant action, dans le sens opposé au sens souhaité. Null quand une valeur manque.
     */
    public function degrade(?float $avant, ?float $apres, string $sens): ?bool
    {
        if ($avant === null || $apres === null) {
            return null;
        }

        return $sens === 'baisse' ? $apres > $avant : $apres < $avant;
    }

    /**
     * @param  iterable<int>  $montants
     */
    public function totalA(iterable $montants): int
    {
        $total = 0;
        foreach ($montants as $montant) {
            $total += (int) $montant;
        }

        return $total;
    }
}
