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
 * Registre des fiches pour l'administrateur fonctionnel : il ne modifie que le pilote,
 * la confidentialité et le valideur d'une demande en attente, jamais le contenu métier (PRD §2.5).
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
            ->with(['unite:id,code,libelle', 'pilote:id,identifiant,nom,prenom,actif'])
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
                $this->notifications->notify([$fiche->pilote_id], $fiche, 'DESIGNATION_PILOTE', 'Vous êtes désigné pilote de cette fiche.', auteurId: $auteurId);
                if ($before['pilote_id'] !== null) {
                    $this->notifications->notify([$before['pilote_id']], $fiche, 'DESIGNATION_PILOTE', 'Vous n’êtes plus pilote de cette fiche.', auteurId: $auteurId);
                }
                $this->reattribuerDemandesDuPilote($fiche, $auteurId);
            }
            if ($fiche->wasChanged('confidentialite')) {
                $this->history->log($fiche, $auteurId, 'CHANGEMENT_CONFIDENTIALITE', 'confidentialite', $before['confidentialite'], $fiche->confidentialite);
            }
        });

        return response()->json(['data' => $this->ficheData($fiche->fresh()->load(['unite:id,code,libelle', 'pilote:id,identifiant,nom,prenom,actif']))]);
    }

    /**
     * Demandes de validation en attente de la fiche, avec les titulaires à qui les réattribuer.
     */
    public function validations(FicheA3 $fiche): JsonResponse
    {
        $demandes = $fiche->validations()
            ->with(['role:id,code,libelle', 'valideur:id,identifiant,nom,prenom,actif'])
            ->where('decision', 'EN_ATTENTE')
            ->orderBy('porte')->orderBy('ordre')
            ->get();

        return response()->json(['data' => $demandes->map(fn (Validation $validation) => $this->validationData($validation, $fiche))]);
    }

    /**
     * Réattribue une demande en attente à un autre titulaire du même rôle.
     */
    public function reattribuerValidation(Request $request, Validation $validation): JsonResponse
    {
        $validated = $request->validate([
            'valideur_id' => ['required', 'integer', 'exists:users,id'],
            'motif' => ['nullable', 'string', 'max:500'],
        ]);
        $fiche = $validation->fiche()->firstOrFail();
        $ancien = $validation->valideur_id;

        $validation = $this->circuit->reattribuer($validation, (int) $validated['valideur_id'], $request->user()->id, $validated['motif'] ?? null);

        if ($validation->valideur_id !== $ancien) {
            $this->audit($request, 'REATTRIBUTION_VALIDATION', 'validation', $validation->id, ['avant' => $ancien, 'apres' => $validation->valideur_id]);
            if ($this->circuit->estActionnable($validation, $fiche)) {
                $this->notifications->notify([$validation->valideur_id], $fiche, 'DEMANDE_VALIDATION', 'Une demande de validation vous a été réattribuée.', 'validation', $validation->id, $request->user()->id);
            }
        }

        return response()->json(['data' => $this->validationData($validation->load(['role:id,code,libelle', 'valideur:id,identifiant,nom,prenom,actif']), $fiche)]);
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
        if ($fiche->statut_etape === StatutEtape::Cloture->value) {
            throw ValidationException::withMessages(['pilote_id' => 'Le pilote d’une fiche clôturée ne change plus.']);
        }
        if ($fiche->statut_etape !== StatutEtape::Ouvert->value) {
            if ($piloteId === null) {
                throw ValidationException::withMessages(['pilote_id' => 'Une fiche en cours de traitement doit garder un pilote.']);
            }
            if ($motif === '') {
                throw ValidationException::withMessages(['motif' => 'Indiquez le motif du changement de pilote.']);
            }
        }

        $estPiloteDeLUnite = $piloteId === null || User::query()
            ->whereKey($piloteId)
            ->where('actif', true)
            ->whereHas('affectations', fn ($query) => $query->where('unite_id', $fiche->unite_id)->enCours()
                ->whereHas('role', fn ($role) => $role->where('code', 'PILOTE')))
            ->exists();

        if (! $estPiloteDeLUnite) {
            throw ValidationException::withMessages(['pilote_id' => 'Le pilote doit avoir une affectation active dans l’unité de la fiche.']);
        }

        // B8 : le nouveau pilote ne doit pas rester valideur d'une demande en attente de sa fiche.
        $demandes = $fiche->validations()->where('decision', 'EN_ATTENTE')->where('valideur_id', $piloteId)->with('role:id,code,libelle')->get();
        foreach ($demandes as $demande) {
            $autres = $this->circuit->titulaires($demande->role->code, $fiche)->reject(fn (int $id) => $id === $piloteId);
            if ($autres->isEmpty()) {
                throw ValidationException::withMessages(['pilote_id' => 'Ce pilote est le seul valideur disponible pour le rôle « '.$demande->role->libelle.' » sur cette fiche.']);
            }
        }
    }

    /**
     * Après un changement de pilote, ses éventuelles demandes de validation sur la fiche
     * passent au titulaire suivant du rôle (B8).
     */
    private function reattribuerDemandesDuPilote(FicheA3 $fiche, int $auteurId): void
    {
        $demandes = $fiche->validations()->where('decision', 'EN_ATTENTE')->where('valideur_id', $fiche->pilote_id)->with('role:id,code')->get();
        foreach ($demandes as $demande) {
            $suivant = $this->circuit->titulaire($demande->role->code, $fiche);
            if ($suivant !== null) {
                $this->circuit->reattribuer($demande, $suivant, $auteurId, 'Le valideur est devenu pilote de la fiche.');
                if ($this->circuit->estActionnable($demande->refresh(), $fiche)) {
                    $this->notifications->notify([$suivant], $fiche, 'DEMANDE_VALIDATION', 'Une demande de validation vous a été réattribuée.', 'validation', $demande->id, $auteurId);
                }
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function validationData(Validation $validation, FicheA3 $fiche): array
    {
        $candidats = User::query()
            ->whereIn('id', $this->circuit->titulaires($validation->role->code, $fiche))
            ->orderBy('nom')
            ->get(['id', 'identifiant', 'nom', 'prenom']);

        return [
            ...$validation->only(['id', 'porte', 'ordre', 'decision']),
            'demandee_le' => $validation->demandee_le?->toDateString(),
            'role' => $validation->role?->only(['id', 'code', 'libelle']),
            'valideur' => $validation->valideur?->only(['id', 'identifiant', 'nom', 'prenom', 'actif']),
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
        ];
    }
}
