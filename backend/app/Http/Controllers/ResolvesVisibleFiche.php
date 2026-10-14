<?php

namespace App\Http\Controllers;

use App\Models\FicheA3;
use App\Services\ActiveProfile;
use App\Services\FicheVisibility;

/**
 * Une fiche hors de la portée du profil actif est introuvable (404), jamais interdite :
 * son existence n'est pas révélée (PRD §2.4).
 */
trait ResolvesVisibleFiche
{
    protected function visible(FicheA3 $fiche, ActiveProfile $profile): FicheA3
    {
        abort_unless(app(FicheVisibility::class)->canView($fiche, $profile), 404, 'Fiche introuvable.');

        return $fiche;
    }
}
