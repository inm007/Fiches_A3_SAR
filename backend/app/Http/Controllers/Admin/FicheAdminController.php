<?php

namespace App\Http\Controllers\Admin;

use App\Enums\StatutEtape;
use App\Models\FicheA3;
use App\Models\User;
use App\Models\Validation;
use App\Services\HistoryLogger;
use App\Services\NotificationService;
use App\Services\ValidationCircuit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Registre des fiches pour l'administrateur fonctionnel : il ne modifie que le pilote, la
 * confidentialité et les valideurs d'une demande en attente,
 * jamais le contenu métier (PRD §2.5).
 */
class FicheAdminController extends AdminController
{
    public function __construct(
        private readonly HistoryLogger $history,
        private readonly NotificationService $notifications,
        private readonly ValidationCircuit $circuit,
    ) {}

    public function index(): JsonResponse
    {
        $fiches = FicheA3::query()
            ->with(['unite:id,code,libelle', 'pilote:id,identifiant,nom,prenom,actif', 'membres:id,identifiant,nom,prenom,actif'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $fiches->map(fn (FicheA3 $fiche) => $this->ficheData($fiche))]);
    }

    public function update(Request $request, FicheA3 $fiche): JsonResponse
    {
        $validated = $request->validate([
            'pilote_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'confidentialite' => ['sometimes', 'required', Rule::in(['NORMAL', 'RESTREINT'])],
            'motif' => ['nullable', 'string', 'max:500'],
        ]);
        $motif = trim((string) ($validated['motif'] ?? ''));
        unset($validated['motif']);

        if ($validated === []) {
            throw ValidationException::withMessages(['fiche' => 'Aucune modification autorisée n’a été fournie.']);
        }
        if (array_key_exists('pilote_id', $validated)) {
            $this->validerPilote($fiche, $validated['pilote_id'], $motif);
        }

        $before = $fiche->only(['pilote_id', 'confidentialite']);
        DB::transaction(function () use ($request, $fiche, $validated, $before, $motif): void {
            $fiche->fill($validated)->save();
            $this->audit($request, 'MODIFICATION_ADMIN_FONCTIONNELLE', 'fiche_a3', $fiche->id, [
                'avant' => $before,
                'apres' => $fiche->only(['pilote_id', 'confidentialite']),
            ]);

            $auteurId = $request->user()->id;
            if ($fiche->wasChanged('pilote_id')) {
                $this->history->log($fiche, $auteurId, 'DESIGNATION_PILOTE', 'pilote_id', $before['pilote_id'], $fiche->pilote_id, $motif ?: null);
                if ($before['pilote_id'] !== null) {
                    $this->notifications->notify([$before['pilote_id']], $fiche, 'DESIGNATION_PILOTE', 'Vous n’êtes plus pilote de cette fiche.', auteurId: $auteurId);
                }
                // Une fiche ouverte peut redevenir sans pilote : rien d'autre à reprendre.
                if ($fiche->pilote_id !== null) {
                    // Un membre de l'équipe qui devient pilote la quitte : une personne, un seul rôle sur la fiche.
                    if ($fiche->membres()->detach($fiche->pilote_id) > 0) {
                        $this->history->log($fiche, $auteurId, 'RETRAIT_MEMBRE', 'equipe', $fiche->pilote_id, null, 'Devenu pilote de la fiche');
                        $fiche->unsetRelation('membres');
                    }
                    $this->notifications->notify([$fiche->pilote_id], $fiche, 'DESIGNATION_PILOTE', 'Vous êtes désigné pilote de cette fiche.', auteurId: $auteurId);
                    $this->reattribuerDemandesDe($fiche, $fiche->pilote_id, $auteurId);
                }
            }
            if ($fiche->wasChanged('confidentialite')) {
                $this->history->log($fiche, $auteurId, 'CHANGEMENT_CONFIDENTIALITE', 'confidentialite', $before['confidentialite'], $fiche->confidentialite);
            }
        });

        return response()->json(['data' => $this->ficheData($this->rechargerFiche($fiche))]);
    }

    /**
     * Demandes de validation en attente de la fiche, avec les titulaires avec qui les partager.
     */
    public function validations(FicheA3 $fiche): JsonResponse
    {
        $demandes = $fiche->validations()
            ->with(['role:id,code,libelle', 'valideur:id,identifiant,nom,prenom,actif', 'partages:id,identifiant,nom,prenom,actif'])
            ->where('decision', 'EN_ATTENTE')
            ->orderBy('porte')->orderBy('ordre')
            ->get();

        return response()->json(['data' => $demandes->map(fn (Validation $validation) => $this->validationData($validation, $fiche))]);
    }

    /**
     * Partage une demande en attente avec un autre titulaire du même rôle : le valideur
     * d'origine la garde, le valideur associé la voit aussi, le premier qui décide la traite.
     */
    public function partagerValidation(Request $request, Validation $validation): JsonResponse
    {
        $validated = $request->validate([
            'valideur_id' => ['required', 'integer', 'exists:users,id'],
            'motif' => ['required', 'string', 'max:500'],
        ]);
        $fiche = $validation->fiche()->firstOrFail();
        $valideurId = (int) $validated['valideur_id'];
        $dejaValideur = $validation->estValideur($valideurId);

        $validation = $this->circuit->partager($validation, $valideurId, $request->user()->id, trim($validated['motif']));

        if (! $dejaValideur) {
            $this->audit($request, 'PARTAGE_VALIDATION', 'validation', $validation->id, ['valideur' => $validation->valideur_id, 'associe' => $valideurId]);
            if ($this->circuit->estActionnable($validation, $fiche)) {
                $this->notifications->notify([$valideurId], $fiche, 'DEMANDE_VALIDATION', 'Une demande de validation est partagée avec vous : vous ou '.$validation->valideur?->nom_complet.' pouvez décider.', 'validation', $validation->id, $request->user()->id);
            }
        }

        return response()->json(['data' => $this->validationData($this->rechargerValidation($validation), $fiche)]);
    }

    /**
     * Retire un valideur associé d'une demande partagée.
     */
    public function retirerPartageValidation(Request $request, Validation $validation, User $user): JsonResponse
    {
        $fiche = $validation->fiche()->firstOrFail();
        $validation = $this->circuit->retirerPartage($validation, $user->id, $request->user()->id);
        $this->audit($request, 'FIN_PARTAGE_VALIDATION', 'validation', $validation->id, ['associe' => $user->id]);

        return response()->json(['data' => $this->validationData($this->rechargerValidation($validation), $fiche)]);
    }

    /**
     * Le pilote se désigne parmi les titulaires actifs du rôle Pilote dans l'unité. Il peut être
     * changé à toute étape avant la clôture (départ, mutation, absence) ; après l'étape Ouvert,
     * la fiche ne peut plus rester sans pilote et le changement exige un motif.
     */
    private function validerPilote(FicheA3 $fiche, ?int $piloteId, string $motif): void
    {
        if ($piloteId === $fiche->pilote_id) {
            return;
        }
        if ($fiche->etape()->estFinale()) {
            throw ValidationException::withMessages(['pilote_id' => 'Le pilote d’une fiche clôturée ou classée ne change plus.']);
        }
        if ($fiche->statut_etape !== StatutEtape::Ouvert->value) {
            if ($piloteId === null) {
                throw ValidationException::withMessages(['pilote_id' => 'Une fiche en cours de traitement doit garder un pilote.']);
            }
            if ($motif === '') {
                throw ValidationException::withMessages(['motif' => 'Indiquez le motif du changement de pilote.']);
            }
        }

        if ($piloteId !== null) {
            $this->verifierPiloteEligible($fiche, $piloteId, 'pilote_id');
        }
    }

    /**
     * Pilote : titulaire actif du rôle Pilote dans l'unité de la fiche, ni sponsor ni chef choisi,
     * et jamais seul valideur disponible d'une demande en attente de cette fiche (B8).
     */
    private function verifierPiloteEligible(FicheA3 $fiche, int $userId, string $champ): void
    {
        $estPiloteDeLUnite = User::query()
            ->whereKey($userId)
            ->where('actif', true)
            ->whereHas('affectations', fn ($query) => $query->where('unite_id', $fiche->unite_id)->enCours()
                ->whereHas('role', fn ($role) => $role->where('code', 'PILOTE')))
            ->exists();

        if (! $estPiloteDeLUnite) {
            throw ValidationException::withMessages([$champ => 'Le pilote doit avoir une affectation active dans l’unité de la fiche.']);
        }
        if (in_array($userId, [$fiche->sponsor_id, $fiche->chef_pertinence_id], true)) {
            throw ValidationException::withMessages([$champ => 'Cette personne valide la fiche (sponsor ou chef de département) : elle ne peut pas aussi la piloter.']);
        }

        $demandes = $fiche->validations()->where('decision', 'EN_ATTENTE')->pourValideur($userId)->with(['role:id,code,libelle', 'partages:id'])->get();
        foreach ($demandes as $demande) {
            $autres = collect($demande->valideursIds())
                ->merge($this->circuit->titulairesDe($demande, $fiche))
                ->reject(fn (int $id) => $id === $userId);
            if ($autres->isEmpty()) {
                throw ValidationException::withMessages([$champ => 'Ce pilote est le seul valideur disponible pour le rôle « '.$demande->role->libelle.' » sur cette fiche.']);
            }
        }
    }

    /**
     * Un utilisateur qui devient pilote ne valide plus sa fiche (B8) :
     * il quitte les demandes partagées, et celles qu'il détient passent à un autre valideur
     * de la demande ou au titulaire suivant du rôle.
     */
    private function reattribuerDemandesDe(FicheA3 $fiche, int $userId, int $auteurId): void
    {
        $demandes = $fiche->validations()->where('decision', 'EN_ATTENTE')->pourValideur($userId)->with(['role:id,code', 'partages:id'])->get();
        foreach ($demandes as $demande) {
            if ($demande->valideur_id !== $userId) {
                $this->circuit->retirerPartage($demande, $userId, $auteurId);

                continue;
            }
            $suivant = collect($demande->valideursIds())->reject(fn (int $id) => $id === $userId)->first()
                ?? $this->circuit->titulaire($demande->role->code, $fiche, $demande->porte);
            if ($suivant !== null) {
                $this->circuit->reattribuer($demande, $suivant, $auteurId, 'Le valideur est devenu pilote de la fiche.');
                if ($this->circuit->estActionnable($demande->refresh(), $fiche)) {
                    $this->notifications->notify([$suivant], $fiche, 'DEMANDE_VALIDATION', 'Une demande de validation vous a été réattribuée.', 'validation', $demande->id, $auteurId);
                }
            }
        }
    }

    private function rechargerFiche(FicheA3 $fiche): FicheA3
    {
        return $fiche->fresh()->load(['unite:id,code,libelle', 'pilote:id,identifiant,nom,prenom,actif', 'membres:id,identifiant,nom,prenom,actif']);
    }

    private function rechargerValidation(Validation $validation): Validation
    {
        return $validation->fresh()->load(['role:id,code,libelle', 'valideur:id,identifiant,nom,prenom,actif', 'partages:id,identifiant,nom,prenom,actif']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validationData(Validation $validation, FicheA3 $fiche): array
    {
        $candidats = User::query()
            ->whereIn('id', $this->circuit->titulairesDe($validation, $fiche))
            ->whereNotIn('id', $validation->valideursIds())
            ->orderBy('nom')
            ->get(['id', 'identifiant', 'nom', 'prenom']);

        return [
            ...$validation->only(['id', 'porte', 'ordre', 'decision']),
            'demandee_le' => $validation->demandee_le?->toDateString(),
            'role' => $validation->role?->only(['id', 'code', 'libelle']),
            'valideur' => $validation->valideur?->only(['id', 'identifiant', 'nom', 'prenom', 'actif']),
            'partages' => $validation->partages->map(fn (User $user) => $user->only(['id', 'identifiant', 'nom', 'prenom', 'actif']))->values()->all(),
            'valideur_indisponible' => $this->circuit->valideurIndisponible($validation, $fiche),
            'candidats' => $candidats->map(fn (User $user) => $user->only(['id', 'identifiant', 'nom', 'prenom']))->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function ficheData(FicheA3 $fiche): array
    {
        return [
            ...$fiche->only(['id', 'numero_a3', 'titre', 'statut_etape', 'statut_general', 'confidentialite']),
            'unite' => $fiche->unite?->only(['id', 'code', 'libelle']),
            'pilote' => $fiche->pilote?->only(['id', 'identifiant', 'nom', 'prenom', 'actif']),
            'membres' => $fiche->membres->map(fn (User $user) => $user->only(['id', 'identifiant', 'nom', 'prenom', 'actif']))->values()->all(),
        ];
    }
}
