<?php

namespace App\Http\Controllers;

use App\Http\Resources\FicheResource;
use App\Models\ActionA3;
use App\Models\Controle;
use App\Models\FicheA3;
use App\Models\Gain;
use App\Models\Validation;
use App\Services\ActionService;
use App\Services\ActiveProfile;
use App\Services\FicheWorkflow;
use App\Services\ValidationCircuit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Transitions, décisions de validation, actions, contrôles et gains (PRD §5 à §8).
 * Les règles vivent dans les services ; ce contrôleur valide et délègue.
 */
class WorkflowController extends Controller
{
    use ResolvesVisibleFiche;

    public function transition(Request $request, FicheA3 $fiche, ActiveProfile $profile, FicheWorkflow $workflow): FicheResource
    {
        $this->visible($fiche, $profile);
        $data = $request->validate([
            'code' => ['required', Rule::in(['T2', 'T3', 'T6', 'T7', 'T8', 'T11', 'T12', 'T13'])],
            'etape' => ['nullable', 'string', 'max:50'],
            'motif' => ['nullable', 'string', 'max:2000'],
        ]);

        return new FicheResource($workflow->transition($fiche, $data, $profile));
    }

    public function decision(Request $request, Validation $validation, ActiveProfile $profile, FicheWorkflow $workflow): FicheResource
    {
        $this->visible($validation->fiche, $profile);
        $data = $request->validate([
            'decision' => ['required', Rule::in(['VALIDE', 'REFUSE'])],
            'commentaire' => ['nullable', 'string', 'max:2000'],
            'retour' => ['nullable', Rule::in(['MESURE_RESULTATS', 'VERIFICATION_MAINTIEN'])],
        ]);

        $validation = $workflow->decider($validation, $data['decision'], $data['commentaire'] ?? null, $data['retour'] ?? null, $profile);

        return new FicheResource($validation->fiche()->firstOrFail());
    }

    /**
     * Demandes qui attendent le profil actif, les plus anciennes en premier (B7).
     */
    public function validations(ActiveProfile $profile, ValidationCircuit $circuit): JsonResponse
    {
        $demandes = Validation::query()
            ->with(['fiche:id,numero_a3,titre,statut_etape,pilote_id,unite_id,sans_gain_chiffre', 'role:id,code,libelle'])
            ->where('valideur_id', $profile->userId())
            ->where('role_id', $profile->roleId())
            ->where('decision', 'EN_ATTENTE')
            ->orderBy('demandee_le')
            ->get()
            ->filter(fn (Validation $validation) => $validation->fiche->pilote_id !== $profile->userId()
                && $circuit->estActionnable($validation, $validation->fiche));

        return response()->json(['data' => $demandes->values()->map(fn (Validation $validation) => [
            'id' => $validation->id,
            'porte' => $validation->porte,
            'role' => $validation->role->libelle,
            'fiche' => $validation->fiche->only(['id', 'numero_a3', 'titre']),
            'demandee_le' => $validation->demandee_le?->toIso8601String(),
            'anciennete_jours' => (int) $validation->demandee_le?->startOfDay()->diffInDays(today()),
        ])]);
    }

    public function actionStatut(Request $request, ActionA3 $action, ActiveProfile $profile, ActionService $actions): FicheResource
    {
        $this->visible($action->fiche, $profile);
        $data = $request->validate([
            'statut' => ['required', Rule::in(['EN_COURS', 'REALISE', 'ANNULE', 'BLOQUE', 'REPRENDRE'])],
            'motif' => ['nullable', 'string', 'max:2000'],
            'date_realisation' => ['nullable', 'date'],
        ]);

        return new FicheResource($actions->changerStatut($action, $data, $profile)->fiche()->firstOrFail());
    }

    public function controle(Request $request, Controle $controle, ActiveProfile $profile, ActionService $actions): FicheResource
    {
        $fiche = $controle->action->fiche;
        $this->visible($fiche, $profile);
        $data = $request->validate([
            'resultat' => ['required', Rule::in(['CONFORME', 'NON_CONFORME'])],
            'commentaire' => ['nullable', 'string', 'max:2000'],
            'preuve' => ['nullable', 'string', 'max:255'],
            'action_corrective' => ['nullable', 'array'],
            'action_corrective.description' => ['required_with:action_corrective', 'string', 'max:2000'],
            'action_corrective.responsable_id' => ['nullable', 'integer', Rule::exists('users', 'id')->where('actif', true)],
            'action_corrective.echeance' => ['required_with:action_corrective', 'date'],
            'action_corrective.cout_estime' => ['nullable', 'integer', 'min:0'],
        ]);

        $actions->enregistrerControle($controle, $data, $profile);

        return new FicheResource($fiche->refresh());
    }

    public function gain(Request $request, Gain $gain, ActiveProfile $profile, FicheWorkflow $workflow): FicheResource
    {
        $this->visible($gain->fiche, $profile);
        $data = $request->validate(['decision' => ['required', Rule::in(['VALIDE', 'REFUSE'])]]);

        return new FicheResource($workflow->deciderGain($gain, $data['decision'], $profile)->fiche()->firstOrFail());
    }
}
