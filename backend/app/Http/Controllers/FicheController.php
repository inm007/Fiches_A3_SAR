<?php

namespace App\Http\Controllers;

use App\Enums\Domaine;
use App\Enums\StatutEtape;
use App\Exceptions\RegleMetierException;
use App\Http\Controllers\Concerns\PagineEtRecherche;
use App\Http\Controllers\Concerns\ResolvesVisibleFiche;
use App\Http\Requests\FicheSectionRules;
use App\Http\Resources\FicheResource;
use App\Models\Affectation;
use App\Models\FicheA3;
use App\Models\Role;
use App\Services\ActiveProfile;
use App\Services\FicheSectionService;
use App\Services\FicheVisibility;
use App\Services\FicheWorkflow;
use App\Services\HistoryLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class FicheController extends Controller
{
    use PagineEtRecherche, ResolvesVisibleFiche;

    private const array SORTS = ['numero_a3', 'date_cible', 'created_at', 'titre'];

    public function __construct(private readonly FicheVisibility $visibility) {}

    /**
     * Registre (PRD §10.3) : recherche, filtres et tris en liste blanche, pagination ≤ 100.
     */
    public function index(Request $request, ActiveProfile $profile): JsonResponse
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'statut_etape' => ['nullable', Rule::enum(StatutEtape::class)],
            'statut_general' => ['nullable', Rule::in(['OUVERT', 'EN_COURS', 'EN_ATTENTE', 'CLOTURE'])],
            'unite_id' => ['nullable', 'integer'],
            'pilote_id' => ['nullable', 'integer'],
            'origine_id' => ['nullable', 'integer'],
            'type_amelioration' => ['nullable', 'string', 'max:50'],
            'equipement_id' => ['nullable', 'integer'],
            'confidentialite' => ['nullable', Rule::in(['NORMAL', 'RESTREINT'])],
            'date_debut' => ['nullable', 'date'],
            'date_fin' => ['nullable', 'date'],
            'sans_pilote' => ['nullable', 'boolean'],
            'tri' => ['nullable', Rule::in(self::SORTS)],
            'ordre' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $query = $this->visibility->apply(FicheA3::query(), $profile)
            ->with(['unite:id,code,libelle', 'pilote:id,nom,prenom', 'copilotes:id,nom,prenom', 'equipement:id,code,libelle'])
            ->when($filters['date_debut'] ?? null, fn (Builder $q, string $date) => $q->whereDate('created_at', '>=', $date))
            ->when($filters['date_fin'] ?? null, fn (Builder $q, string $date) => $q->whereDate('created_at', '<=', $date))
            ->when($filters['sans_pilote'] ?? false, fn (Builder $q) => $q->whereNull('pilote_id'));

        $this->rechercherMots($query, $filters['q'] ?? null, fn (Builder $search, string $motif) => $search
            ->where('numero_a3', 'ilike', $motif)
            ->orWhere('titre', 'ilike', $motif)
            ->orWhereHas('unite', fn (Builder $unit) => $unit->where('libelle', 'ilike', $motif)->orWhere('code', 'ilike', $motif))
            ->orWhereHas('equipement', fn (Builder $equipement) => $equipement->where('code', 'ilike', $motif)->orWhere('libelle', 'ilike', $motif))
            ->orWhereHas('pilote', fn (Builder $pilot) => $pilot->where('prenom', 'ilike', $motif)->orWhere('nom', 'ilike', $motif)));

        $query->when($filters['pilote_id'] ?? null, fn (Builder $q, mixed $value) => $q->pilotePar((int) $value));
        foreach (['statut_etape', 'statut_general', 'unite_id', 'origine_id', 'type_amelioration', 'equipement_id', 'confidentialite'] as $field) {
            $query->when($filters[$field] ?? null, fn (Builder $q, mixed $value) => $q->where($field, $value));
        }

        $page = $query
            ->orderBy($filters['tri'] ?? 'created_at', $filters['ordre'] ?? 'desc')
            ->orderByDesc('id')
            ->paginate($filters['per_page'] ?? 25);

        return response()->json([
            'data' => collect($page->items())->map(fn (FicheA3 $fiche) => [
                'id' => $fiche->id,
                'numero_a3' => $fiche->numero_a3,
                'titre' => $fiche->titre,
                'unite' => $fiche->unite?->libelle,
                'equipement' => $fiche->equipement ? trim($fiche->equipement->code.' — '.$fiche->equipement->libelle, ' —') : null,
                'pilote' => collect([$fiche->pilote?->nom_complet])->merge($fiche->copilotes->map->nom_complet)->filter()->join(', '),
                'statut_etape' => $fiche->statut_etape,
                'statut_etape_libelle' => $fiche->etape()->libelle(),
                'statut_general' => $fiche->statut_general,
                'date_cible' => $fiche->date_cible?->toDateString(),
                'confidentialite' => $fiche->confidentialite,
                'anciennete_jours' => (int) $fiche->created_at->startOfDay()->diffInDays(today()),
                'en_retard' => $fiche->date_cible !== null && $fiche->date_cible->isBefore(today()) && $fiche->statut_etape !== StatutEtape::Cloture->value,
            ]),
            'meta' => $this->metaPagination($page),
        ]);
    }

    /**
     * T1 : déclaration en une étape (PRD §4.1).
     */
    public function store(Request $request, ActiveProfile $profile, FicheWorkflow $workflow): JsonResponse
    {
        $data = $request->validate([
            'titre' => ['required', 'string', 'max:255'],
            'unite_id' => ['required', 'integer', Rule::exists('unites', 'id')->where('actif', true)],
            'origine_id' => ['required', 'integer', 'exists:valeurs_listes,id'],
            'origine_precision' => ['nullable', 'string', 'max:255'],
            'enonce_probleme' => ['required', 'string', 'max:5000'],
            'equipement_id' => ['nullable', 'integer', Rule::exists('equipements', 'id')->where('actif', true)],
            'confidentialite' => ['nullable', Rule::in(['NORMAL', 'RESTREINT'])],
        ]);

        $erreurs = FicheSectionService::erreursIdentification($data);
        if ($erreurs !== []) {
            throw ValidationException::withMessages($erreurs);
        }

        $fiche = $workflow->declarer($data, $profile);

        return response()->json(['data' => ['id' => $fiche->id, 'numero_a3' => $fiche->numero_a3]], 201);
    }

    public function show(FicheA3 $fiche, ActiveProfile $profile): FicheResource
    {
        return new FicheResource($this->visible($fiche, $profile));
    }

    public function meDesigner(FicheA3 $fiche, ActiveProfile $profile, HistoryLogger $history): FicheResource
    {
        if (! $profile->is('PILOTE')
            || $profile->userId() !== $fiche->declarant_id
            || $profile->uniteId() !== $fiche->unite_id
            || $fiche->pilote_id !== null
            || $fiche->etape() !== StatutEtape::Ouvert) {
            throw RegleMetierException::interdit('Seul le pilote déclarant affecté à l’unité peut se désigner sur sa fiche encore ouverte.');
        }

        $fiche = DB::transaction(function () use ($fiche, $profile, $history): FicheA3 {
            /** @var FicheA3 $fiche */
            $fiche = FicheA3::query()->whereKey($fiche->id)->lockForUpdate()->firstOrFail();

            if ($fiche->declarant_id !== $profile->userId()
                || $fiche->pilote_id !== null
                || $fiche->etape() !== StatutEtape::Ouvert
                || $profile->uniteId() !== $fiche->unite_id) {
                throw RegleMetierException::conflit('Cette fiche a déjà été attribuée ou son étape a changé.');
            }

            $fiche->update(['pilote_id' => $profile->userId()]);
            $history->log($fiche, $profile->userId(), 'DESIGNATION_PILOTE', 'pilote_id', null, $profile->userId(), 'Auto-désignation par le pilote déclarant');

            return $fiche->refresh();
        });

        return new FicheResource($fiche);
    }

    public function updateSection(Request $request, FicheA3 $fiche, int $section, ActiveProfile $profile, FicheSectionService $sections): FicheResource
    {
        $this->visible($fiche, $profile);
        abort_unless($section >= 1 && $section <= 11, 404);

        $data = $request->validate(FicheSectionRules::pour($section));

        return new FicheResource($sections->enregistrer($fiche, $section, $data, $profile));
    }

    /**
     * Le pilote bascule Normal / Restreint (l'administrateur passe par /admin/fiches).
     */
    public function updateConfidentialite(Request $request, FicheA3 $fiche, ActiveProfile $profile, HistoryLogger $history): FicheResource
    {
        $this->visible($fiche, $profile);
        $data = $request->validate([
            'confidentialite' => ['required', Rule::in(['NORMAL', 'RESTREINT'])],
            'motif' => ['nullable', 'string', 'max:500'],
        ]);

        if (! $profile->estPiloteDe($fiche)) {
            throw RegleMetierException::interdit('Seul le pilote de la fiche change sa confidentialité.');
        }

        if ($fiche->confidentialite !== $data['confidentialite']) {
            $ancienne = $fiche->confidentialite;
            $fiche->update(['confidentialite' => $data['confidentialite']]);
            $history->log($fiche, $profile->userId(), 'CHANGEMENT_CONFIDENTIALITE', 'confidentialite', $ancienne, $data['confidentialite'], $data['motif'] ?? null);
        }

        return new FicheResource($fiche->refresh());
    }

    /**
     * Historique (PRD §14) : pilote, Direction et administrateur fonctionnel.
     */
    public function historique(FicheA3 $fiche, ActiveProfile $profile): JsonResponse
    {
        $this->visible($fiche, $profile);
        if (! $profile->peutVoirHistorique()) {
            throw RegleMetierException::interdit('L’historique est réservé au pilote, à la Direction et à l’administrateur fonctionnel.');
        }

        $evenements = $fiche->evenements()
            ->with('user:id,nom,prenom')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        return response()->json(['data' => $evenements->map(fn ($evenement) => [
            'id' => $evenement->id,
            'type' => $evenement->type,
            'champ' => $evenement->champ,
            'ancienne_valeur' => $evenement->ancien_etat['valeur'] ?? null,
            'nouvelle_valeur' => $evenement->nouvel_etat['valeur'] ?? null,
            'commentaire' => $evenement->commentaire,
            'version_fiche' => $evenement->version_fiche,
            'auteur' => $evenement->user?->nom_complet ?? 'Système',
            'created_at' => $evenement->created_at?->toIso8601String(),
        ])]);
    }

    /**
     * Personnes et rôles proposés dans les formulaires de la fiche.
     */
    public function options(FicheA3 $fiche, ActiveProfile $profile): JsonResponse
    {
        $this->visible($fiche, $profile);

        return response()->json(['data' => [
            'responsables' => $this->titulaires(['AGENT', 'PILOTE'], $fiche->unite_id),
            'sponsors' => $this->titulaires(['DIRECTION'], null),
            'pilotes' => $this->titulaires(['PILOTE'], $fiche->unite_id, false),
            'roles_valideurs' => Role::whereIn('code', Domaine::rolesValideurs())->orderBy('id')->get(['code', 'libelle']),
        ]]);
    }

    /**
     * @param  array<int, string>  $roles
     * @return array<int, array{id: int, nom: string}>
     */
    private function titulaires(array $roles, ?int $uniteId, bool $avecGlobal = true): array
    {
        return Affectation::query()
            ->with('user:id,nom,prenom,actif')
            ->enCours()
            ->whereHas('role', fn ($q) => $q->whereIn('code', $roles))
            ->whereHas('user', fn ($q) => $q->where('actif', true))
            ->when($uniteId !== null, fn ($q) => $q->where(fn ($scope) => $scope
                ->where('unite_id', $uniteId)
                ->when($avecGlobal, fn ($global) => $global->orWhereNull('unite_id'))))
            ->get()
            ->pluck('user')
            ->unique('id')
            ->sortBy('nom')
            ->map(fn ($user) => ['id' => $user->id, 'nom' => $user->nom_complet])
            ->values()
            ->all();
    }
}
