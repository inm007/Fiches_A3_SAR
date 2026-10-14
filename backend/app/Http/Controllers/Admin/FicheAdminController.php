<?php

namespace App\Http\Controllers\Admin;

use App\Enums\StatutEtape;
use App\Models\FicheA3;
use App\Models\User;
use App\Services\HistoryLogger;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Registre des fiches pour l'administrateur fonctionnel : il ne modifie que le pilote
 * (à l'étape Ouvert) et la confidentialité, jamais le contenu métier (PRD §2.5).
 */
class FicheAdminController extends AdminController
{
    public function __construct(
        private readonly HistoryLogger $history,
        private readonly NotificationService $notifications,
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
        ]);

        if ($validated === []) {
            throw ValidationException::withMessages(['fiche' => 'Aucune modification autorisée n’a été fournie.']);
        }
        if (array_key_exists('pilote_id', $validated)) {
            $this->validerPilote($fiche, $validated['pilote_id']);
        }

        $before = $fiche->only(['pilote_id', 'confidentialite']);
        DB::transaction(function () use ($request, $fiche, $validated, $before): void {
            $fiche->fill($validated)->save();
            $this->audit($request, 'MODIFICATION_ADMIN_FONCTIONNELLE', 'fiche_a3', $fiche->id, [
                'avant' => $before,
                'apres' => $fiche->only(['pilote_id', 'confidentialite']),
            ]);

            $auteurId = $request->user()->id;
            if ($fiche->wasChanged('pilote_id')) {
                $this->history->log($fiche, $auteurId, 'DESIGNATION_PILOTE', 'pilote_id', $before['pilote_id'], $fiche->pilote_id);
                $this->notifications->notify([$fiche->pilote_id], $fiche, 'DESIGNATION_PILOTE', 'Vous êtes désigné pilote de cette fiche.', auteurId: $auteurId);
            }
            if ($fiche->wasChanged('confidentialite')) {
                $this->history->log($fiche, $auteurId, 'CHANGEMENT_CONFIDENTIALITE', 'confidentialite', $before['confidentialite'], $fiche->confidentialite);
            }
        });

        return response()->json(['data' => $this->ficheData($fiche->fresh()->load(['unite:id,code,libelle', 'pilote:id,identifiant,nom,prenom,actif']))]);
    }

    /**
     * Le pilote se désigne à l'étape Ouvert, parmi les titulaires actifs du rôle Pilote dans l'unité.
     */
    private function validerPilote(FicheA3 $fiche, ?int $piloteId): void
    {
        if ($fiche->statut_etape !== StatutEtape::Ouvert->value && $piloteId !== $fiche->pilote_id) {
            throw ValidationException::withMessages(['pilote_id' => 'Le pilote ne peut être désigné que lorsque la fiche est à l’étape Ouvert.']);
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
