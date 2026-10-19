<?php

namespace App\Services;

use App\Models\EvenementHistorique;
use App\Models\FicheA3;

/**
 * Historique métier immuable (PRD §14) : écrit par le serveur seulement.
 * Un auteur null désigne le Système.
 */
class HistoryLogger
{
    public function log(
        FicheA3 $fiche,
        ?int $auteurId,
        string $type,
        ?string $champ = null,
        mixed $ancien = null,
        mixed $nouveau = null,
        ?string $commentaire = null,
    ): EvenementHistorique {
        return EvenementHistorique::create([
            'fiche_id' => $fiche->id,
            'user_id' => $auteurId,
            'type' => $type,
            'champ' => $champ,
            'ancien_etat' => $ancien === null ? null : ['valeur' => $ancien],
            'nouvel_etat' => $nouveau === null ? null : ['valeur' => $nouveau],
            'commentaire' => $commentaire,
            'version_fiche' => $fiche->version,
            'created_at' => now(),
        ]);
    }

    /**
     * Une ligne par champ modifié lors d'un enregistrement explicite du pilote.
     *
     * @param  array<string, mixed>  $avant
     * @param  array<string, mixed>  $apres
     */
    public function logChanges(FicheA3 $fiche, ?int $auteurId, array $avant, array $apres): void
    {
        foreach ($apres as $champ => $valeur) {
            $ancienne = $avant[$champ] ?? null;
            if ($this->normalize($ancienne) === $this->normalize($valeur)) {
                continue;
            }

            $this->log($fiche, $auteurId, 'MODIFICATION_CHAMP', $champ, $ancienne, $valeur);
        }
    }

    private function normalize(mixed $value): string
    {
        return json_encode($value, JSON_UNESCAPED_UNICODE) ?: '';
    }
}
