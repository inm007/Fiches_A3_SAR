<?php

namespace App\Services;

use App\Models\FicheA3;

/**
 * Changement de confidentialité d'une fiche, par son pilote ou par l'administrateur
 * fonctionnel : une seule règle et une seule trace dans l'historique.
 */
class FicheConfidentialite
{
    public function __construct(private readonly HistoryLogger $history) {}

    public function peutChanger(FicheA3 $fiche, ActiveProfile $profile): bool
    {
        return $profile->estPiloteDe($fiche) || $profile->is('ADMIN_FONCTIONNEL');
    }

    /**
     * Applique le niveau demandé et le trace ; ne fait rien s'il ne change pas.
     */
    public function changer(FicheA3 $fiche, string $niveau, int $auteurId, ?string $motif = null): bool
    {
        $ancien = $fiche->confidentialite;
        if ($ancien === $niveau) {
            return false;
        }

        $fiche->update(['confidentialite' => $niveau]);
        $this->history->log($fiche, $auteurId, 'CHANGEMENT_CONFIDENTIALITE', 'confidentialite', $ancien, $niveau, $motif);

        return true;
    }
}
