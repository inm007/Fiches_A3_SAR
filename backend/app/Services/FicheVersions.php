<?php

namespace App\Services;

use App\Http\Resources\FicheResource;
use App\Models\FicheA3;
use App\Models\FicheVersion;
use Illuminate\Http\Request;

/**
 * Copies figées de la fiche (soumission du plan, clôture) : après une nouvelle boucle,
 * la version précédente reste consultable et imprimable telle qu'elle a été validée.
 */
class FicheVersions
{
    public function figer(FicheA3 $fiche, string $evenement, ?int $auteurId): FicheVersion
    {
        // Requête neutre : la copie ne dépend pas du profil de celui qui déclenche l'étape.
        $contenu = (new FicheResource($fiche->fresh()))->toArray(Request::create('/'));
        unset($contenu['droits'], $contenu['derniers_enregistrements'], $contenu['prochaine_etape']);

        return FicheVersion::create([
            'fiche_id' => $fiche->id,
            'version' => $fiche->version,
            'evenement' => $evenement,
            'contenu' => json_decode(json_encode($contenu, JSON_UNESCAPED_UNICODE) ?: '{}', true),
            'auteur_id' => $auteurId,
        ]);
    }
}
