<?php

namespace App\Http\Controllers;

use App\Enums\StatutAction;
use App\Enums\StatutEtape;
use App\Models\ActionA3;
use App\Models\Affectation;
use App\Models\Controle;
use App\Models\FicheA3;
use App\Models\Gain;
use App\Models\Unite;
use App\Models\ValeurListe;
use App\Models\Validation;
use App\Services\ActiveProfile;
use App\Services\Calculs;
use App\Services\FicheVisibility;
use App\Services\ValidationCircuit;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * Indicateurs du tableau de bord (PRD §10), calculés par le serveur et limités
 * à la visibilité du profil actif : une fiche invisible n'entre dans aucun total.
 * Les indicateurs annuels (taux et délai de clôture, gains validés) portent sur l'année
 * choisie, l'année en cours par défaut, pour consolider les gains en fin d'année.
 */
class TableauDeBordController extends Controller
{
    public function index(Request $request, ActiveProfile $profile, FicheVisibility $visibility, ValidationCircuit $circuit, Calculs $calculs): JsonResponse
    {
        $annee = (int) ($request->validate([
            'annee' => ['nullable', 'integer', 'min:2000', 'max:'.now()->year],
        ])['annee'] ?? now()->year);
        $userId = $profile->userId();
        $visibles = fn (): Builder => $visibility->apply(FicheA3::query(), $profile);
        $visibleIds = $visibles()->select('id');

        $parEtape = $visibles()->selectRaw('statut_etape, count(*) as total')->groupBy('statut_etape')->pluck('total', 'statut_etape');
        $actionsParStatut = ActionA3::query()
            ->whereIn('fiche_id', $visibleIds)
            ->selectRaw('statut, count(*) as total')
            ->groupBy('statut')
            ->pluck('total', 'statut');
        $actionsOuvertes = ActionA3::query()->whereIn('fiche_id', $visibleIds)->whereNotIn('statut', StatutAction::terminees());
        $debutPeriode = now()->startOfMonth()->subMonths(5);
        $fichesParMois = $visibles()
            ->where('created_at', '>=', $debutPeriode)
            ->get(['created_at'])
            ->countBy(fn (FicheA3 $fiche) => $fiche->created_at->format('Y-m'));

        $validations = $circuit->aTraiterPar($profile);

        $creesCetteAnnee = $visibles()->whereYear('created_at', $annee);
        $cloturees = $visibles()->where('statut_etape', StatutEtape::Cloture->value)->whereYear('date_cloture', $annee)->get(['created_at', 'date_cloture']);

        return response()->json(['data' => [
            'role' => $profile->roleCode(),
            'annee' => $annee,
            'annees_disponibles' => $this->anneesDisponibles($visibles()),
            'part_verification_efficacite' => $this->partVerificationEfficacite($visibles()),
            'repartition' => $this->repartition($visibles),
            'par_etape' => collect(StatutEtape::cases())->mapWithKeys(fn (StatutEtape $etape) => [$etape->value => (int) ($parEtape[$etape->value] ?? 0)]),
            'actions_par_statut' => collect(StatutAction::cases())->mapWithKeys(fn (StatutAction $statut) => [$statut->value => (int) ($actionsParStatut[$statut->value] ?? 0)]),
            'fiches_creees_par_mois' => collect(range(0, 5))->map(function (int $offset) use ($debutPeriode, $fichesParMois) {
                $mois = $debutPeriode->copy()->addMonths($offset);
                $cle = $mois->format('Y-m');

                return ['mois' => $cle, 'total' => (int) ($fichesParMois[$cle] ?? 0)];
            })->values(),
            'fiches_total' => (int) $parEtape->sum(),
            'fiches_ouvertes' => (int) $parEtape->except([StatutEtape::Cloture->value])->sum(),
            'fiches_en_retard' => $visibles()->where('statut_etape', '!=', StatutEtape::Cloture->value)->whereDate('date_cible', '<', today())->count(),
            'fiches_sans_pilote' => $visibles()->whereNull('pilote_id')->where('statut_etape', StatutEtape::Ouvert->value)->count(),
            'mes_fiches' => $visibles()->where(fn (Builder $q) => $q->pilotePar($userId)->orWhere('declarant_id', $userId))->count(),
            'actions_en_retard' => (clone $actionsOuvertes)->whereDate('echeance', '<', today())->count(),
            'mes_actions_a_faire' => (clone $actionsOuvertes)->where('responsable_id', $userId)->count(),
            'mes_actions_en_retard' => (clone $actionsOuvertes)->where('responsable_id', $userId)->whereDate('echeance', '<', today())->count(),
            'validations_a_traiter' => $validations->count(),
            'plus_ancienne_demande_jours' => $validations->isEmpty() ? null : (int) $validations->first()->demandee_le->startOfDay()->diffInDays(today()),
            'validations_en_attente_sur_mes_fiches' => Validation::query()->where('decision', 'EN_ATTENTE')
                ->whereHas('fiche', fn (Builder $q) => $q->pilotePar($userId))->count(),
            'decisions_recentes' => Validation::query()->where('valideur_id', $userId)->whereIn('decision', ['VALIDE', 'REFUSE'])
                ->where('decidee_le', '>=', now()->subDays(30))->count(),
            'controles_disponibles' => Controle::query()->whereNull('resultat')->whereDate('date_echeance', '<=', today())
                ->whereHas('action.fiche', fn (Builder $q) => $q->pilotePar($userId))->count(),
            'gains_a_valider' => $visibles()->where('statut_etape', StatutEtape::EnValidationCloture->value)->whereHas('gains', fn (Builder $q) => $q->where('statut', 'PROPOSE'))->count(),
            'gains_valides_annee' => (int) Gain::query()->whereIn('fiche_id', $visibleIds)->where('statut', 'VALIDE')
                ->whereYear('date_validation', $annee)->sum('montant_annuel'),
            'gain_net_annuel_valide' => $this->gainNetValide($visibles(), $annee, $calculs),
            'taux_cloture' => ($total = (clone $creesCetteAnnee)->count()) > 0
                ? round((clone $creesCetteAnnee)->where('statut_etape', StatutEtape::Cloture->value)->count() / $total * 100, 1)
                : null,
            'delai_moyen_cloture_jours' => $cloturees->isEmpty() ? null : (int) round($cloturees->avg(fn (FicheA3 $fiche) => $fiche->created_at->startOfDay()->diffInDays($fiche->date_cloture))),
            'affectations_actives' => $profile->is('ADMIN_FONCTIONNEL') ? Affectation::where('actif', true)->count() : null,
            'a_traiter' => $this->aTraiter($validations, $profile, $visibles, $circuit),
        ]]);
    }

    /**
     * Années proposées au sélecteur : de la première fiche visible à l'année en cours.
     *
     * @param  Builder<FicheA3>  $visibles
     * @return array<int, int>
     */
    private function anneesDisponibles(Builder $visibles): array
    {
        // L'année précédente reste toujours consultable : c'est elle qu'on consolide en janvier.
        $courante = (int) now()->year;
        $premiere = $visibles->min('created_at');
        $debut = $premiere ? (int) substr((string) $premiere, 0, 4) : $courante;

        return range($courante, min($debut, $courante - 1));
    }

    /**
     * Part des fiches avec vérification d'efficacité renseignée (cahier de stage, PRD §10.1) :
     * parmi les fiches arrivées à la mesure des résultats ou au-delà, celles dont au moins un
     * contrôle est enregistré et dont aucun contrôle échu ne reste à renseigner.
     *
     * @param  Builder<FicheA3>  $visibles
     */
    private function partVerificationEfficacite(Builder $visibles): ?float
    {
        $etapes = [StatutEtape::MesureResultats->value, StatutEtape::VerificationMaintien->value, StatutEtape::EnValidationCloture->value, StatutEtape::Cloture->value];
        $concernees = $visibles->where(fn (Builder $q) => $q->whereIn('statut_etape', $etapes)
            ->orWhere(fn (Builder $attente) => $attente->where('statut_etape', StatutEtape::EnAttente->value)->whereIn('etape_avant_attente', $etapes)));

        $total = (clone $concernees)->count();
        if ($total === 0) {
            return null;
        }

        $verifiees = (clone $concernees)
            ->whereHas('actions.controles', fn (Builder $q) => $q->whereNotNull('resultat'))
            ->whereDoesntHave('actions.controles', fn (Builder $q) => $q->whereNull('resultat')->whereDate('date_echeance', '<=', today()))
            ->count();

        return round($verifiees / $total * 100, 1);
    }

    /**
     * Répartition des fiches visibles par unité, type d'amélioration et origine (PRD §10.2).
     *
     * @param  callable(): Builder<FicheA3>  $visibles
     * @return array<string, array<int, array{libelle: string, total: int}>>
     */
    private function repartition(callable $visibles): array
    {
        $compter = fn (string $colonne) => $visibles()->selectRaw("{$colonne} as cle, count(*) as total")->groupBy($colonne)->pluck('total', 'cle');
        $libelles = fn (string $liste) => ValeurListe::query()->deLaListe($liste);
        $formater = fn (Collection $totaux, Collection $noms) => $totaux
            ->map(fn ($total, $cle) => ['libelle' => $noms[$cle] ?? ($cle === '' ? 'Non renseigné' : (string) $cle), 'total' => (int) $total])
            ->sortByDesc('total')
            ->values()
            ->all();

        $parType = $compter('type_amelioration')->mapWithKeys(fn ($total, $cle) => [(string) $cle => $total]);

        return [
            'unite' => $formater($compter('unite_id'), Unite::query()->pluck('libelle', 'id')),
            'type_amelioration' => $formater($parType, $libelles('type_amelioration')->pluck('libelle', 'code')->put('', 'Non renseigné')),
            'origine' => $formater($compter('origine_id'), $libelles('origine')->pluck('libelle', 'id')),
        ];
    }

    /**
     * Gain net (A − B) des fiches dont tous les gains sont validés, par année de validation (PRD §6.3).
     *
     * @param  Builder<FicheA3>  $visibles
     */
    private function gainNetValide(Builder $visibles, int $annee, Calculs $calculs): int
    {
        return (int) $visibles
            ->whereHas('gains')
            ->whereDoesntHave('gains', fn (Builder $q) => $q->where('statut', '!=', 'VALIDE'))
            ->with('gains:id,fiche_id,montant_annuel,date_validation')
            ->get(['id', 'cout_mise_en_oeuvre_b'])
            ->filter(fn (FicheA3 $fiche) => (int) $fiche->gains->max('date_validation')?->year === $annee)
            ->sum(fn (FicheA3 $fiche) => $calculs->gainNet($calculs->totalA($fiche->gains->pluck('montant_annuel')), (int) $fiche->cout_mise_en_oeuvre_b));
    }

    /**
     * Ce que le profil actif doit traiter : chaque ligne mène à la fiche.
     *
     * @param  Collection<int, Validation>  $validations
     * @param  callable(): Builder<FicheA3>  $visibles
     * @return array<int, array<string, mixed>>
     */
    private function aTraiter($validations, ActiveProfile $profile, callable $visibles, ValidationCircuit $circuit): array
    {
        $userId = $profile->userId();
        $items = $validations->map(fn (Validation $validation) => [
            'fiche_id' => $validation->fiche_id,
            'numero_a3' => $validation->fiche->numero_a3,
            'libelle' => $validation->porte === 1 ? 'Valider le plan (porte 1)' : 'Valider la clôture (porte 2)',
            'delai' => (int) $validation->demandee_le->startOfDay()->diffInDays(today()).' j',
            'type' => 'validation',
        ]);

        $actions = ActionA3::query()
            ->with('fiche:id,numero_a3')
            ->whereIn('fiche_id', $visibles()->select('id'))
            ->whereNotIn('statut', StatutAction::terminees())
            ->whereDate('echeance', '<', today())
            ->where(fn (Builder $q) => $q->where('responsable_id', $userId)->orWhereHas('fiche', fn (Builder $f) => $f->pilotePar($userId)))
            ->orderBy('echeance')
            ->limit(5)
            ->get()
            ->map(fn (ActionA3 $action) => [
                'fiche_id' => $action->fiche_id,
                'numero_a3' => $action->fiche->numero_a3,
                'libelle' => 'Action en retard : '.str($action->description)->limit(50),
                'delai' => (int) $action->echeance->diffInDays(today()).' j',
                'type' => 'retard',
            ]);

        $controles = Controle::query()
            ->with('action.fiche:id,numero_a3')
            ->whereNull('resultat')
            ->whereDate('date_echeance', '<=', today())
            ->whereHas('action.fiche', fn (Builder $q) => $q->pilotePar($userId))
            ->orderBy('date_echeance')
            ->limit(5)
            ->get()
            ->map(fn (Controle $controle) => [
                'fiche_id' => $controle->action->fiche_id,
                'numero_a3' => $controle->action->fiche->numero_a3,
                'libelle' => 'Contrôle '.Controle::nomJalon($controle->jalon).' disponible',
                'delai' => $controle->date_echeance->isToday() ? 'aujourd’hui' : (int) $controle->date_echeance->diffInDays(today()).' j',
                'type' => 'controle',
            ]);

        $sansPilote = $profile->is('ADMIN_FONCTIONNEL')
            ? $visibles()->whereNull('pilote_id')->where('statut_etape', StatutEtape::Ouvert->value)->orderBy('created_at')->limit(5)->get(['id', 'numero_a3', 'created_at'])
                ->map(fn (FicheA3 $fiche) => [
                    'fiche_id' => $fiche->id,
                    'numero_a3' => $fiche->numero_a3,
                    'libelle' => 'Désigner le pilote',
                    'delai' => (int) $fiche->created_at->startOfDay()->diffInDays(today()).' j',
                    'type' => 'pilote',
                ])
            : collect();

        // Une demande dont le valideur n'est plus disponible attend une réattribution.
        $bloquees = $profile->is('ADMIN_FONCTIONNEL')
            ? Validation::query()
                ->with(['fiche', 'role:id,code'])
                ->where('decision', 'EN_ATTENTE')
                ->whereIn('fiche_id', $visibles()->select('id'))
                ->orderBy('demandee_le')
                ->get()
                ->filter(fn (Validation $validation) => $circuit->valideurIndisponible($validation, $validation->fiche))
                ->take(5)
                ->map(fn (Validation $validation) => [
                    'fiche_id' => $validation->fiche_id,
                    'numero_a3' => $validation->fiche->numero_a3,
                    'libelle' => 'Réattribuer une validation : valideur indisponible',
                    'delai' => (int) $validation->demandee_le->startOfDay()->diffInDays(today()).' j',
                    'type' => 'reattribution',
                ])
            : collect();

        return $bloquees->concat($items)->concat($actions)->concat($controles)->concat($sansPilote)->take(8)->values()->all();
    }
}
