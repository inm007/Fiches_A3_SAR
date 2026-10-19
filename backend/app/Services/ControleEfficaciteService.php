<?php

namespace App\Services;

use App\Enums\StatutAction;
use App\Models\ActionA3;
use App\Models\Controle;
use App\Models\FicheA3;
use Illuminate\Support\Carbon;

/**
 * Contrôles d'efficacité J+30, J+60, J+90 par action (PRD §8.3, D1) et B4.
 * Hypothèse D2 : une action corrective est vérifiée une seule fois, à 30 jours.
 */
class ControleEfficaciteService
{
    private const array JALONS = ['J30' => 30, 'J60' => 60, 'J90' => 90];

    public function creerPourAction(ActionA3 $action): void
    {
        $reference = Carbon::parse($action->date_realisation);
        $jalons = $action->action_origine_id !== null ? ['CORRECTIF' => 30] : self::JALONS;

        foreach ($jalons as $jalon => $jours) {
            Controle::firstOrCreate(
                ['action_id' => $action->id, 'jalon' => $jalon],
                [
                    'date_reference' => $reference->toDateString(),
                    'date_echeance' => $reference->copy()->addDays($jours)->toDateString(),
                ],
            );
        }
    }

    /**
     * Conditions B4 non satisfaites pour la soumission de la clôture (T8).
     *
     * @return array<int, string>
     */
    public function manques(FicheA3 $fiche): array
    {
        $manques = [];
        $actions = $fiche->actions()
            ->whereNull('action_origine_id')
            ->where('statut', '!=', StatutAction::Annule->value)
            ->with('controles')
            ->get();

        foreach ($actions as $action) {
            foreach ($this->manquesAction($action, array_keys(self::JALONS)) as $manque) {
                $manques[] = $manque;
            }
        }

        return $manques;
    }

    /**
     * @param  array<int, string>  $jalonsRequis
     * @return array<int, string>
     */
    private function manquesAction(ActionA3 $action, array $jalonsRequis): array
    {
        $libelle = '« '.str($action->description)->limit(60).' »';

        if ($action->statut !== StatutAction::Realise->value) {
            return ["Action {$libelle} : elle doit être réalisée avant ses contrôles."];
        }

        $manques = [];
        foreach ($jalonsRequis as $jalon) {
            $controle = $action->controles->firstWhere('jalon', $jalon);
            $nom = Controle::nomJalon($jalon, 'de l’action corrective');

            if ($controle === null || $controle->resultat === null) {
                $echeance = $controle?->date_echeance?->format('d/m/Y');

                if ($controle?->date_echeance?->isAfter(today())) {
                    $manques[] = "Action {$libelle} : contrôle {$nom} à venir (échéance le {$echeance}). La clôture attendra ce contrôle.";

                    continue;
                }

                $manques[] = "Action {$libelle} : contrôle {$nom} non renseigné".($echeance ? " (échéance {$echeance})." : '.');

                continue;
            }

            if ($controle->resultat === 'NON_CONFORME') {
                $corrective = $controle->actionCorrective()->with('controles')->first();
                if ($corrective === null) {
                    $manques[] = "Action {$libelle} : contrôle {$nom} non conforme sans action corrective.";

                    continue;
                }

                if ($corrective->statut === StatutAction::Annule->value) {
                    $manques[] = "Action {$libelle} : l’action corrective du contrôle {$nom} est annulée.";

                    continue;
                }

                array_push($manques, ...$this->manquesAction($corrective, ['CORRECTIF']));
            }
        }

        return $manques;
    }
}
