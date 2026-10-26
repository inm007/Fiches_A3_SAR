<?php

namespace App\Services;

use App\Enums\StatutAction;
use App\Models\ActionA3;
use App\Models\Controle;
use App\Models\FicheA3;
use App\Support\Manque;
use Illuminate\Support\Carbon;

/**
 * Contrôles d'efficacité J+30, J+60, J+90 par action (PRD §8.3, D1) et B4.
 * Hypothèse D2 : une action corrective est vérifiée une seule fois, à 30 jours.
 *
 * Maintien du résultat (règle d'or de la fiche papier) : le KPI principal est remesuré
 * à J+30, J+60 et J+90 de la mesure des résultats (T7) ; il doit tenir sa cible.
 */
class ControleEfficaciteService
{
    private const array JALONS = ['J30' => 30, 'J60' => 60, 'J90' => 90];

    public function __construct(private readonly Calculs $calculs) {}

    /**
     * Jalons de maintien du KPI principal : échéance, mesure saisie et cible tenue ou non.
     *
     * @return array<int, array{jalon: string, echeance: string|null, disponible: bool, valeur: float|null, date_mesure: string|null, commentaire: string|null, tenu: bool|null}>
     */
    public function maintien(FicheA3 $fiche): array
    {
        $principal = $fiche->indicateurs->firstWhere('principal', true);
        $cible = $principal?->mesures->firstWhere('type', 'CIBLE')?->valeur;
        $jalons = [];

        foreach (self::JALONS as $jalon => $jours) {
            $echeance = $fiche->date_resultats?->copy()->addDays($jours);
            $mesure = $principal?->mesures->firstWhere('type', 'MAINTIEN_'.$jalon);
            $valeur = $mesure !== null ? (float) $mesure->valeur : null;
            $jalons[] = [
                'jalon' => $jalon,
                'echeance' => $echeance?->toDateString(),
                'disponible' => $echeance !== null && ! $echeance->isAfter(today()),
                'valeur' => $valeur,
                'date_mesure' => $mesure?->date_mesure?->toDateString(),
                'commentaire' => $mesure?->commentaire,
                'tenu' => $principal ? $this->calculs->cibleTenue($valeur, $cible !== null ? (float) $cible : null, $principal->sens) : null,
            ];
        }

        return $jalons;
    }

    /**
     * Conditions de maintien non satisfaites pour la soumission de la clôture (T8).
     *
     * @return array<int, Manque>
     */
    public function manquesMaintien(FicheA3 $fiche): array
    {
        $fiche->loadMissing('indicateurs.mesures');
        $manques = [];

        foreach ($this->maintien($fiche) as $jalon) {
            $nom = Controle::nomJalon($jalon['jalon'], '');
            $echeance = $jalon['echeance'] !== null ? Carbon::parse($jalon['echeance'])->format('d/m/Y') : null;

            if ($jalon['valeur'] === null) {
                $manques[] = Manque::section(8, $jalon['disponible']
                    ? "Maintien du résultat : mesure {$nom} du KPI principal à saisir (échéance {$echeance})."
                    : "Maintien du résultat : mesure {$nom} du KPI principal à venir (le {$echeance}). La clôture attendra cette mesure.");
            } elseif ($jalon['tenu'] === false) {
                $manques[] = Manque::section(8, "Maintien du résultat : le KPI principal ne tient plus sa cible à {$nom}. Lancez une nouvelle boucle.");
            }
        }

        return $manques;
    }

    /**
     * Date à partir de laquelle la clôture peut être soumise : dernier contrôle d'action
     * et dernière mesure de maintien. Null tant que rien n'est programmé.
     */
    public function clotureAuPlusTot(FicheA3 $fiche): ?string
    {
        $dates = $fiche->actions
            ->where('statut', '!=', StatutAction::Annule->value)
            ->flatMap(fn (ActionA3 $action) => $action->controles->whereNull('resultat')->pluck('date_echeance'))
            ->push($fiche->date_resultats?->copy()->addDays(90))
            ->filter();

        return $dates->isEmpty() ? null : $dates->max()->toDateString();
    }

    public function creerPourAction(ActionA3 $action): void
    {
        $reference = Carbon::parse($action->date_realisation);
        $jalons = $action->action_origine_id !== null ? ['CORRECTIF' => 30] : self::JALONS;

        foreach ($jalons as $jalon => $jours) {
            Controle::firstOrCreate(
                ['action_id' => $action->id, 'jalon' => $jalon],
                ['date_echeance' => $reference->copy()->addDays($jours)->toDateString()],
            );
        }
    }

    /**
     * Conditions B4 non satisfaites pour la soumission de la clôture (T8).
     *
     * @return array<int, Manque>
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
     * @return array<int, Manque>
     */
    private function manquesAction(ActionA3 $action, array $jalonsRequis): array
    {
        $libelle = '« '.str($action->description)->limit(60).' »';

        if ($action->statut !== StatutAction::Realise->value) {
            return [Manque::actions("Action {$libelle} : elle doit être réalisée avant ses contrôles.", $action->id)];
        }

        $manques = [];
        foreach ($jalonsRequis as $jalon) {
            $controle = $action->controles->firstWhere('jalon', $jalon);
            $nom = Controle::nomJalon($jalon, 'de l’action corrective');

            if ($controle === null || $controle->resultat === null) {
                $echeance = $controle?->date_echeance?->format('d/m/Y');

                if ($controle?->date_echeance?->isAfter(today())) {
                    $manques[] = Manque::controles("Action {$libelle} : contrôle {$nom} à venir (échéance le {$echeance}). La clôture attendra ce contrôle.", $action->id);

                    continue;
                }

                $manques[] = Manque::controles("Action {$libelle} : contrôle {$nom} non renseigné".($echeance ? " (échéance {$echeance})." : '.'), $action->id);

                continue;
            }

            if ($controle->resultat === 'NON_CONFORME') {
                $corrective = $controle->actionCorrective()->with('controles')->first();
                if ($corrective === null) {
                    $manques[] = Manque::controles("Action {$libelle} : contrôle {$nom} non conforme sans action corrective.", $action->id);

                    continue;
                }

                if ($corrective->statut === StatutAction::Annule->value) {
                    $manques[] = Manque::controles("Action {$libelle} : l’action corrective du contrôle {$nom} est annulée.", $action->id);

                    continue;
                }

                array_push($manques, ...$this->manquesAction($corrective, ['CORRECTIF']));
            }
        }

        return $manques;
    }
}
