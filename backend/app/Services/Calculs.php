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
     * Gain annuel d'une ligne en FCFA entiers : quantité × coût unitaire, arrondi à l'entier.
     */
    public function gainAnnuel(float $quantite, int $coutUnitaire): int
    {
        return (int) round($quantite * $coutUnitaire);
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

    public function gainNet(int $totalA, int $coutB): int
    {
        return $totalA - $coutB;
    }

    /**
     * Délai de retour en années (B ÷ A), seulement si A est strictement positif.
     */
    public function paybackAnnees(int $totalA, int $coutB): ?float
    {
        if ($totalA <= 0) {
            return null;
        }

        return round($coutB / $totalA, 2);
    }
}
