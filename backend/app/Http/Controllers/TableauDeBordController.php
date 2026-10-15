<?php

namespace App\Http\Controllers;

use App\Enums\StatutAction;
use App\Enums\StatutEtape;
use App\Models\ActionA3;
use App\Models\Affectation;
use App\Models\Controle;
use App\Models\FicheA3;
use App\Models\Gain;
use App\Models\Validation;
use App\Services\ActiveProfile;
use App\Services\Calculs;
use App\Services\FicheVisibility;
use App\Services\ValidationCircuit;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;

/**
 * Indicateurs du tableau de bord (PRD §10), calculés par le serveur et limités
 * à la visibilité du profil actif : une fiche invisible n'entre dans aucun total.
 */
class TableauDeBordController extends Controller
{
    public function index(ActiveProfile $profile, FicheVisibility $visibility, ValidationCircuit $circuit, Calculs $calculs): JsonResponse
    {
        $userId = $profile->userId();
        $visibles = fn (): Builder => $visibility->apply(FicheA3::query(), $profile);
        $visibleIds = $visibles()->select('id');
        $annee = (int) now()->year;

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

        $validations = Validation::query()
            ->with('fiche:id,numero_a3,titre,statut_etape,pilote_id,sans_gain_chiffre')
            ->where('valideur_id', $userId)
            ->where('role_id', $profile->roleId())
            ->where('decision', 'EN_ATTENTE')
            ->orderBy('demandee_le')
            ->get()
            ->filter(fn (Validation $validation) => $validation->fiche->pilote_id !== $userId && $circuit->estActionnable($validation, $validation->fiche))
            ->values();

        $creesCetteAnnee = $visibles()->whereYear('created_at', $annee);
        $cloturees = $visibles()->where('statut_etape', StatutEtape::Cloture->value)->whereNotNull('date_cloture')->get(['created_at', 'date_cloture']);

        return response()->json(['data' => [
            'role' => $profile->roleCode(),
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
            'mes_fiches' => $visibles()->where(fn (Builder $q) => $q->where('pilote_id', $userId)->orWhere('declarant_id', $userId))->count(),
            'actions_en_retard' => (clone $actionsOuvertes)->whereDate('echeance', '<', today())->count(),
            'mes_actions_a_faire' => (clone $actionsOuvertes)->where('responsable_id', $userId)->count(),
            'mes_actions_en_retard' => (clone $actionsOuvertes)->where('responsable_id', $userId)->whereDate('echeance', '<', today())->count(),
            'validations_a_traiter' => $validations->count(),
            'plus_ancienne_demande_jours' => $validations->isEmpty() ? null : (int) $validations->first()->demandee_le->startOfDay()->diffInDays(today()),
            'validations_en_attente_sur_mes_fiches' => Validation::query()->where('decision', 'EN_ATTENTE')
                ->whereHas('fiche', fn (Builder $q) => $q->where('pilote_id', $userId))->count(),
            'decisions_recentes' => Validation::query()->where('valideur_id', $userId)->whereIn('decision', ['VALIDE', 'REFUSE'])
                ->where('decidee_le', '>=', now()->subDays(30))->count(),
            'controles_disponibles' => Controle::query()->whereNull('resultat')->whereDate('date_echeance', '<=', today())
                ->whereHas('action.fiche', fn (Builder $q) => $q->where('pilote_id', $userId))->count(),
            'gains_a_valider' => $visibles()->where('statut_etape', StatutEtape::EnValidationCloture->value)->whereHas('gains', fn (Builder $q) => $q->where('statut', 'PROPOSE'))->count(),
            'gains_valides_annee' => (int) Gain::query()->whereIn('fiche_id', $visibleIds)->where('statut', 'VALIDE')
                ->whereYear('date_validation', $annee)->sum('montant_annuel'),
            'gain_net_annuel_valide' => $this->gainNetValide($visibles(), $annee, $calculs),
            'taux_cloture' => ($total = (clone $creesCetteAnnee)->count()) > 0
                ? round((clone $creesCetteAnnee)->where('statut_etape', StatutEtape::Cloture->value)->count() / $total * 100, 1)
                : null,
            'delai_moyen_cloture_jours' => $cloturees->isEmpty() ? null : (int) round($cloturees->avg(fn (FicheA3 $fiche) => $fiche->created_at->startOfDay()->diffInDays($fiche->date_cloture))),
            'affectations_actives' => $profile->is('ADMIN_FONCTIONNEL') ? Affectation::where('actif', true)->count() : null,
            'a_traiter' => $this->aTraiter($validations, $profile, $visibles),
        ]]);
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
    private function aTraiter($validations, ActiveProfile $profile, callable $visibles): array
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
            ->where(fn (Builder $q) => $q->where('responsable_id', $userId)->orWhereHas('fiche', fn (Builder $f) => $f->where('pilote_id', $userId)))
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
            ->whereHas('action.fiche', fn (Builder $q) => $q->where('pilote_id', $userId))
            ->orderBy('date_echeance')
            ->limit(5)
            ->get()
            ->map(fn (Controle $controle) => [
                'fiche_id' => $controle->action->fiche_id,
                'numero_a3' => $controle->action->fiche->numero_a3,
                'libelle' => 'Contrôle '.($controle->jalon === 'CORRECTIF' ? 'correctif' : 'J+'.substr($controle->jalon, 1)).' disponible',
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

        return $items->concat($actions)->concat($controles)->concat($sansPilote)->take(8)->values()->all();
    }
}
