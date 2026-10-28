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
use App\Models\DomaineRole;
use App\Models\FicheA3;
use App\Models\FicheVersion;
use App\Models\Role;
use App\Models\User;
use App\Services\ActiveProfile;
use App\Services\FicheSectionService;
use App\Services\FicheVisibility;
use App\Services\FicheWorkflow;
use App\Services\HistoriqueRecit;
use App\Services\HistoryLogger;
use App\Services\NotificationService;
use App\Services\Organigramme;
use App\Services\ValidationCircuit;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
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
            'statut_general' => ['nullable', Rule::in(['OUVERT', 'EN_COURS', 'EN_ATTENTE', 'CLOTURE', 'CLASSE'])],
            'unite_id' => ['nullable', 'integer'],
            'pilote_id' => ['nullable', 'integer'],
            'origine_id' => ['nullable', 'integer'],
            'type_amelioration' => ['nullable', 'string', 'max:50'],
            'equipement_id' => ['nullable', 'integer'],
            'confidentialite' => ['nullable', Rule::in(['NORMAL', 'RESTREINT'])],
            'date_debut' => ['nullable', 'date'],
            'date_fin' => ['nullable', 'date'],
            'sans_pilote' => ['nullable', 'boolean'],
            'equipe' => ['nullable', 'boolean'],
            'tri' => ['nullable', Rule::in(self::SORTS)],
            'ordre' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $query = $this->visibility->apply(FicheA3::query(), $profile)
            ->with(['unite:id,code,libelle', 'pilote:id,nom,prenom', 'membres:id,nom,prenom', 'equipement:id,code,libelle'])
            ->when($filters['date_debut'] ?? null, fn (Builder $q, string $date) => $q->whereDate('created_at', '>=', $date))
            ->when($filters['date_fin'] ?? null, fn (Builder $q, string $date) => $q->whereDate('created_at', '<=', $date))
            ->when($filters['sans_pilote'] ?? false, fn (Builder $q) => $q->whereNull('pilote_id'))
            // « Mes équipes » : les fiches dont l'utilisateur est membre.
            ->when($filters['equipe'] ?? false, fn (Builder $q) => $q->avecMembre((int) $profile->userId()));

        $this->rechercherMots($query, $filters['q'] ?? null, fn (Builder $search, string $motif) => $search
            ->where('numero_a3', 'ilike', $motif)
            ->orWhere('titre', 'ilike', $motif)
            ->orWhereHas('unite', fn (Builder $unit) => $unit->where('libelle', 'ilike', $motif)->orWhere('code', 'ilike', $motif))
            ->orWhereHas('equipement', fn (Builder $equipement) => $equipement->where('code', 'ilike', $motif)->orWhere('libelle', 'ilike', $motif))
            ->orWhereHas('pilote', fn (Builder $pilot) => $pilot->where('prenom', 'ilike', $motif)->orWhere('nom', 'ilike', $motif))
            ->orWhereHas('membres', fn (Builder $membre) => $membre->where('prenom', 'ilike', $motif)->orWhere('nom', 'ilike', $motif)));

        $query->when($filters['pilote_id'] ?? null, fn (Builder $q, mixed $value) => $q->where('pilote_id', (int) $value));
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
                'pilote' => $fiche->pilote?->nom_complet,
                'membres' => $fiche->membres->sortBy('pivot.created_at')->map->nom_complet->values(),
                'est_membre' => $fiche->estMembre($profile->userId()),
                'statut_etape' => $fiche->statut_etape,
                'statut_etape_libelle' => $fiche->etape()->libelle(),
                'statut_general' => $fiche->statut_general,
                'date_cible' => $fiche->date_cible?->toDateString(),
                'confidentialite' => $fiche->confidentialite,
                'anciennete_jours' => (int) $fiche->created_at->startOfDay()->diffInDays(today()),
                'en_retard' => $fiche->date_cible !== null && $fiche->date_cible->isBefore(today()) && ! $fiche->etape()->estFinale(),
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
            'piloter' => ['nullable', 'boolean'],
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
        if (! $profile->peutSeDesignerPilote($fiche)) {
            throw RegleMetierException::interdit('Seul le pilote déclarant affecté à l’unité peut se désigner sur sa fiche encore ouverte.');
        }

        $fiche = DB::transaction(function () use ($fiche, $profile, $history): FicheA3 {
            /** @var FicheA3 $fiche */
            $fiche = FicheA3::query()->whereKey($fiche->id)->lockForUpdate()->firstOrFail();

            if (! $profile->peutSeDesignerPilote($fiche)) {
                throw RegleMetierException::conflit('Cette fiche a déjà été attribuée ou son étape a changé.');
            }

            $fiche->update(['pilote_id' => $profile->userId()]);
            $history->log($fiche, $profile->userId(), 'DESIGNATION_PILOTE', 'pilote_id', null, $profile->userId(), 'Auto-désignation par le pilote déclarant');

            return $fiche->refresh();
        });

        return new FicheResource($fiche);
    }

    /**
     * Le pilote compose l'équipe à la fin de la section 4, comme il choisit le chef de
     * département : des agents ou des pilotes actifs, même d'une autre unité. Le membre est
     * invité par une notification ; il voit la fiche et renseigne les sections 5 à 11.
     * Un membre ne valide pas la fiche (B8).
     */
    public function ajouterMembre(Request $request, FicheA3 $fiche, ActiveProfile $profile, HistoryLogger $history, NotificationService $notifications): FicheResource
    {
        $this->visible($fiche, $profile);
        $data = $request->validate(['user_id' => ['required', 'integer', Rule::exists('users', 'id')->where('actif', true)]]);
        $this->exigerGestionEquipe($fiche, $profile);

        $userId = (int) $data['user_id'];
        if ($fiche->estPilote($userId)) {
            throw RegleMetierException::conditionsManquantes('Membre non ajouté.', ['Cette personne pilote déjà la fiche.']);
        }
        if (! $this->membresPossibles()->contains('id', $userId)) {
            throw RegleMetierException::conditionsManquantes('Membre non ajouté.', ['L’équipe se compose d’agents et de pilotes actifs.']);
        }
        if (in_array($userId, [$fiche->sponsor_id, $fiche->chef_pertinence_id], true)
            || $fiche->validations()->where('decision', 'EN_ATTENTE')->pourValideur($userId)->exists()) {
            throw RegleMetierException::conditionsManquantes('Membre non ajouté.', ['Cette personne valide la fiche (sponsor, chef de département ou valideur) : elle ne peut pas aussi la rédiger.']);
        }

        DB::transaction(function () use ($fiche, $userId, $profile, $history, $notifications): void {
            if ($fiche->membres()->whereKey($userId)->exists()) {
                return;
            }
            $fiche->membres()->attach($userId, ['ajoute_par' => $profile->userId()]);
            $history->log($fiche, $profile->userId(), 'AJOUT_MEMBRE', 'equipe', null, $userId);
            $notifications->notify([$userId], $fiche, 'AJOUT_MEMBRE', $profile->user()->nom_complet.' vous invite dans l’équipe de la fiche : vous la voyez et renseignez les sections 5 à 11.', auteurId: $profile->userId());
        });

        return new FicheResource($fiche->refresh());
    }

    public function retirerMembre(FicheA3 $fiche, User $user, ActiveProfile $profile, HistoryLogger $history, NotificationService $notifications): FicheResource
    {
        $this->visible($fiche, $profile);
        $this->exigerGestionEquipe($fiche, $profile);

        DB::transaction(function () use ($fiche, $user, $profile, $history, $notifications): void {
            if ($fiche->membres()->detach($user->id) > 0) {
                $history->log($fiche, $profile->userId(), 'RETRAIT_MEMBRE', 'equipe', $user->id, null);
                $notifications->notify([$user->id], $fiche, 'RETRAIT_MEMBRE', 'Vous ne faites plus partie de l’équipe de cette fiche.', auteurId: $profile->userId());
            }
        });

        return new FicheResource($fiche->refresh());
    }

    private function exigerGestionEquipe(FicheA3 $fiche, ActiveProfile $profile): void
    {
        if (! $profile->estPiloteDe($fiche)) {
            throw RegleMetierException::interdit('Seul le pilote de la fiche gère son équipe.');
        }
        if (! $fiche->etape()->estActive()) {
            throw RegleMetierException::conflit('L’équipe ne change plus à cette étape.');
        }
    }

    /**
     * Agents et pilotes actifs : ceux qui peuvent rejoindre l'équipe d'une fiche.
     *
     * @return Collection<int, array{id: int, nom: string}>
     */
    private function membresPossibles(): Collection
    {
        return collect($this->titulaires(['AGENT', 'PILOTE'], null));
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
    public function historique(FicheA3 $fiche, ActiveProfile $profile, HistoriqueRecit $recit): JsonResponse
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

        $phrases = $recit->phrases($evenements);

        return response()->json(['data' => $evenements->map(fn ($evenement) => [
            'id' => $evenement->id,
            'type' => $evenement->type,
            'phrase' => $phrases->get($evenement->id),
            'commentaire' => $evenement->commentaire,
            'version_fiche' => $evenement->version_fiche,
            'auteur' => $evenement->user?->nom_complet ?? 'Système',
            'created_at' => $evenement->created_at?->toIso8601String(),
        ])]);
    }

    /**
     * Copies figées de la fiche (soumission du plan, clôture), les plus récentes en premier :
     * elles suivent la visibilité de la fiche.
     */
    public function versions(FicheA3 $fiche, ActiveProfile $profile): JsonResponse
    {
        $this->visible($fiche, $profile);

        return response()->json(['data' => $fiche->versions()->with('auteur:id,nom,prenom')->orderByDesc('id')->get()->map(fn (FicheVersion $version) => [
            'id' => $version->id,
            'version' => $version->version,
            'evenement' => $version->evenement,
            'auteur' => $version->auteur?->nom_complet ?? 'Système',
            'created_at' => $version->created_at?->toIso8601String(),
            'contenu' => $version->contenu,
        ])]);
    }

    /**
     * Personnes et rôles proposés dans les formulaires de la fiche.
     */
    public function options(FicheA3 $fiche, ActiveProfile $profile, Organigramme $organigramme): JsonResponse
    {
        $this->visible($fiche, $profile);

        $estPilote = $profile->estPiloteDe($fiche);

        return response()->json(['data' => [
            // Les membres de l'équipe, même d'une autre unité, peuvent porter une action.
            'responsables' => collect($this->titulaires(['AGENT', 'PILOTE'], $fiche->unite_id))
                ->merge($fiche->membres()->where('actif', true)->get(['users.id', 'nom', 'prenom'])->map(fn (User $user) => ['id' => $user->id, 'nom' => $user->nom_complet]))
                ->unique('id')->sortBy('nom')->values()->all(),
            'sponsors' => $this->titulaires(ValidationCircuit::rolesDirecteurs(), null),
            'chefs' => $this->titulaires([Organigramme::ROLE_CHEF], null),
            'chef_propose' => $organigramme->chefPropose($fiche->pilote),
            'pilotes' => $this->titulaires(['PILOTE'], $fiche->unite_id, false),
            'roles_valideurs' => Role::whereIn('code', Domaine::rolesValideurs())->orderBy('id')->get(['code', 'libelle']),
            'directeurs_par_domaine' => collect(DomaineRole::correspondance())->map(fn (array $codes) => Role::whereIn('code', $codes)->orderBy('id')->pluck('libelle')->all()),
            // Seul le pilote compose l'équipe : la liste des personnes n'est envoyée qu'à lui.
            'membres_possibles' => $estPilote ? $this->membresPossibles()->values() : [],
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
