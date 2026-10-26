<?php

namespace App\Http\Controllers;

use App\Enums\StatutAction;
use App\Enums\StatutEtape;
use App\Models\ActionA3;
use App\Models\Affectation;
use App\Models\Controle;
use App\Models\FicheA3;
use App\Models\Gain;
use App\Models\User;
use App\Models\Validation;
use App\Services\ActiveProfile;
use App\Services\FicheVisibility;
use App\Services\ValidationCircuit;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * Indicateurs du tableau de bord, calculés par le serveur et limités à la visibilité
 * du profil actif : une fiche invisible n'entre dans aucun total. Les indicateurs annuels
 * (taux de clôture, gains validés, évolution mois par mois) portent sur l'année choisie,
 * l'année en cours par défaut, pour consolider les gains en fin d'année. La Direction et
 * l'administrateur fonctionnel reçoivent en plus leur courbe et leurs indicateurs propres ;
 * la Direction et le Contrôle de gestion, les indicateurs de pilotage du sujet (délai moyen
 * de clôture, efficacité vérifiée, gain net annuel).
 */
class TableauDeBordController extends Controller
{
    public function index(Request $request, ActiveProfile $profile, FicheVisibility $visibility, ValidationCircuit $circuit): JsonResponse
    {
        $annee = (int) ($request->validate([
            'annee' => ['nullable', 'integer', 'min:2000', 'max:'.now()->year],
        ])['annee'] ?? now()->year);
        $userId = $profile->userId();
        $visibles = fn (): Builder => $visibility->apply(FicheA3::query(), $profile);
        $visibleIds = $visibles()->select('id');

        $actionsOuvertes = ActionA3::query()->whereIn('fiche_id', $visibleIds)->whereNotIn('statut', StatutAction::terminees());

        $validations = $circuit->aTraiterPar($profile);

        // Une fiche classée sans suite n'est pas une amélioration : elle sort du taux de clôture.
        $creesCetteAnnee = $visibles()->whereYear('created_at', $annee)->where('statut_etape', '!=', StatutEtape::ClasseSansSuite->value);

        return response()->json(['data' => [
            'role' => $profile->roleCode(),
            'annee' => $annee,
            'annees_disponibles' => $this->anneesDisponibles($visibles()),
            'fiches_total' => $visibles()->count(),
            'fiches_ouvertes' => $visibles()->whereNotIn('statut_etape', StatutEtape::valeursFinales())->count(),
            'fiches_en_retard' => $visibles()->whereNotIn('statut_etape', StatutEtape::valeursFinales())->whereDate('date_cible', '<', today())->count(),
            'fiches_sans_pilote' => $visibles()->whereNull('pilote_id')->where('statut_etape', StatutEtape::Ouvert->value)->count(),
            'mes_fiches' => $visibles()->where(fn (Builder $q) => $q->pilotePar($userId)->orWhere('declarant_id', $userId))->count(),
            'actions_en_retard' => (clone $actionsOuvertes)->whereDate('echeance', '<', today())->count(),
            'mes_actions_a_faire' => (clone $actionsOuvertes)->where('responsable_id', $userId)->count(),
            'mes_actions_en_retard' => (clone $actionsOuvertes)->where('responsable_id', $userId)->whereDate('echeance', '<', today())->count(),
            'validations_a_traiter' => $validations->count(),
            'plus_ancienne_demande_jours' => $validations->isEmpty() ? null : (int) $validations->first()->demandee_le->startOfDay()->diffInDays(today()),
            'validations_en_attente_sur_mes_fiches' => Validation::query()->where('decision', 'EN_ATTENTE')
                ->whereHas('fiche', fn (Builder $q) => $q->pilotePar($userId))->count(),
            'controles_disponibles' => Controle::query()->whereNull('resultat')->whereDate('date_echeance', '<=', today())
                ->whereHas('action.fiche', fn (Builder $q) => $q->pilotePar($userId))->count(),
            'gains_a_valider' => $visibles()->where('statut_etape', StatutEtape::EnValidationCloture->value)->whereHas('gains', fn (Builder $q) => $q->where('statut', 'PROPOSE'))->count(),
            'gains_valides_annee' => (int) Gain::query()->whereIn('fiche_id', $visibleIds)->where('statut', 'VALIDE')
                ->whereYear('date_validation', $annee)->sum('montant_annuel'),
            'taux_cloture' => ($total = (clone $creesCetteAnnee)->count()) > 0
                ? round((clone $creesCetteAnnee)->where('statut_etape', StatutEtape::Cloture->value)->count() / $total * 100, 1)
                : null,
            'affectations_actives' => $profile->is('ADMIN_FONCTIONNEL') ? Affectation::where('actif', true)->count() : null,
            'evolution' => $profile->is('DIRECTION', 'ADMIN_FONCTIONNEL') ? $this->evolution($visibles, $visibleIds, $annee) : null,
            'unites' => $profile->is('DIRECTION') ? $this->parUnite($visibles) : null,
            'administration' => $profile->is('ADMIN_FONCTIONNEL') ? $this->administration() : null,
            'pilotage' => $profile->is('DIRECTION', 'CONTROLE_GESTION') ? $this->pilotage($visibles, $visibleIds, $annee) : null,
            'a_traiter' => $this->aTraiter($validations, $profile, $visibles, $circuit),
        ]]);
    }

    /**
     * Mois par mois sur l'année choisie : fiches déclarées, fiches clôturées et gains validés.
     *
     * @param  callable(): Builder<FicheA3>  $visibles
     * @return array<int, array{mois: int, declarees: int, cloturees: int, gains_valides: int}>
     */
    private function evolution(callable $visibles, Builder $visibleIds, int $annee): array
    {
        $parMois = fn (Collection $dates): Collection => $dates->filter()->countBy(fn ($date) => (int) $date->month);
        $declarees = $parMois($visibles()->whereYear('created_at', $annee)->pluck('created_at'));
        $cloturees = $parMois($visibles()->where('statut_etape', StatutEtape::Cloture->value)->whereYear('date_cloture', $annee)->pluck('date_cloture'));
        $gains = Gain::query()->whereIn('fiche_id', $visibleIds)->where('statut', 'VALIDE')->whereYear('date_validation', $annee)
            ->get(['date_validation', 'montant_annuel'])
            ->groupBy(fn (Gain $gain) => (int) $gain->date_validation->month)
            ->map(fn (Collection $lignes) => (int) $lignes->sum('montant_annuel'));

        // L'année en cours s'arrête au mois courant : pas de mois à venir affichés à zéro.
        $dernier = $annee === (int) now()->year ? (int) now()->month : 12;

        return collect(range(1, $dernier))->map(fn (int $mois) => [
            'mois' => $mois,
            'declarees' => $declarees->get($mois, 0),
            'cloturees' => $cloturees->get($mois, 0),
            'gains_valides' => $gains->get($mois, 0),
        ])->all();
    }

    /**
     * Où ça bloque : fiches ouvertes et en retard par unité, les unités les plus en retard d'abord.
     *
     * @param  callable(): Builder<FicheA3>  $visibles
     * @return array<int, array{unite: string, ouvertes: int, en_retard: int}>
     */
    private function parUnite(callable $visibles): array
    {
        return $visibles()
            ->with('unite:id,libelle')
            ->whereNotIn('statut_etape', StatutEtape::valeursFinales())
            ->get(['id', 'unite_id', 'date_cible'])
            ->groupBy('unite_id')
            ->map(fn (Collection $fiches) => [
                'unite' => $fiches->first()->unite?->libelle ?? '—',
                'ouvertes' => $fiches->count(),
                'en_retard' => $fiches->filter(fn (FicheA3 $fiche) => $fiche->date_cible?->lt(today()))->count(),
            ])
            ->sortByDesc(fn (array $ligne) => [$ligne['en_retard'], $ligne['ouvertes']])
            ->take(6)
            ->values()
            ->all();
    }

    /**
     * Indicateurs de pilotage de la démarche sur les fiches clôturées dans l'année : délai moyen
     * de clôture, part des fiches dont l'efficacité a été vérifiée, et gain net (gains validés
     * moins le coût de mise en œuvre des fiches concernées).
     *
     * @param  callable(): Builder<FicheA3>  $visibles
     * @return array{delai_moyen_cloture_jours: int|null, part_efficacite_verifiee: float|null, gains_nets_annee: int, couts_mise_en_oeuvre_annee: int}
     */
    private function pilotage(callable $visibles, Builder $visibleIds, int $annee): array
    {
        $cloturees = $visibles()->where('statut_etape', StatutEtape::Cloture->value)->whereYear('date_cloture', $annee)
            ->withExists(['controles as efficacite_verifiee' => fn (Builder $q) => $q->whereNotNull('resultat')])
            ->get(['id', 'created_at', 'date_cloture']);

        $gains = Gain::query()->whereIn('fiche_id', $visibleIds)->where('statut', 'VALIDE')->whereYear('date_validation', $annee);
        $couts = (int) FicheA3::query()->whereIn('id', (clone $gains)->select('fiche_id'))->sum('cout_mise_en_oeuvre_b');

        return [
            'delai_moyen_cloture_jours' => $cloturees->isEmpty() ? null
                : (int) round($cloturees->avg(fn (FicheA3 $fiche) => $fiche->created_at->startOfDay()->diffInDays($fiche->date_cloture))),
            'part_efficacite_verifiee' => $cloturees->isEmpty() ? null
                : round($cloturees->where('efficacite_verifiee', true)->count() / $cloturees->count() * 100, 1),
            'gains_nets_annee' => (int) $gains->sum('montant_annuel') - $couts,
            'couts_mise_en_oeuvre_annee' => $couts,
        ];
    }

    /**
     * Santé des comptes pour l'administrateur fonctionnel : qui peut travailler, qui est bloqué.
     *
     * @return array<string, int>
     */
    private function administration(): array
    {
        $actifs = User::query()->where('actif', true);

        return [
            'utilisateurs_actifs' => (clone $actifs)->count(),
            'connectes_30_jours' => (clone $actifs)->where('derniere_connexion', '>=', now()->subDays(30))->count(),
            'sans_role' => (clone $actifs)->whereDoesntHave('affectations', fn (Builder $q) => $q->where('actif', true))->count(),
            'affectations_expirant' => Affectation::query()->where('actif', true)
                ->whereNotNull('date_fin')->whereBetween('date_fin', [now(), now()->addDays(30)])->count(),
        ];
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
            'libelle' => match ($validation->porte) {
                0 => 'Valider la pertinence (porte 0)',
                1 => 'Valider le plan (porte 1)',
                default => 'Valider la clôture (porte 2)',
            },
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

        // Fiche déclarée sans pilote : l'administrateur désigne un pilote de l'unité.
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
