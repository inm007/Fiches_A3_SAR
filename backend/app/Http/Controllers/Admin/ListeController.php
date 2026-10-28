<?php

namespace App\Http\Controllers\Admin;

use App\Models\Liste;
use App\Models\ValeurListe;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Écran Listes de choix : les listes sont fixes, leurs valeurs sont administrables et réordonnables.
 * Une valeur se désactive sans suppression pour conserver les libellés historiques.
 */
class ListeController extends AdminController
{
    private const array CHAMPS_VALEUR = ['id', 'liste_id', 'parent_id', 'code', 'libelle', 'ordre', 'actif'];

    public function index(): JsonResponse
    {
        $listes = Liste::query()
            ->with(['valeurs' => fn ($query) => $query->orderBy('ordre')->orderBy('id')])
            ->orderBy('libelle')
            ->get();

        return response()->json(['data' => $listes->map(fn (Liste $liste) => [
            ...$liste->only(['id', 'code', 'libelle', 'description']),
            'valeurs' => $liste->valeurs->map->only(self::CHAMPS_VALEUR)->values(),
        ])]);
    }

    public function valeurs(Liste $liste): JsonResponse
    {
        return response()->json(['data' => $this->valeursOrdonnees($liste)]);
    }

    public function storeValeur(Request $request, Liste $liste): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:255', Rule::unique('valeurs_listes', 'code')->where('liste_id', $liste->id)],
            'libelle' => ['required', 'string', 'max:255'],
            'ordre' => ['sometimes', 'integer', 'min:0'],
            'actif' => ['sometimes', 'boolean'],
        ]);
        $validated['ordre'] ??= ((int) $liste->valeurs()->max('ordre')) + 1;
        $validated['actif'] ??= true;

        $valeur = DB::transaction(function () use ($request, $liste, $validated): ValeurListe {
            $valeur = $liste->valeurs()->create($validated);
            $this->audit($request, 'CREATION', 'valeur_liste', $valeur->id, $valeur->only(self::CHAMPS_VALEUR));

            return $valeur;
        });

        return response()->json(['data' => $valeur->only(self::CHAMPS_VALEUR)], 201);
    }

    public function updateValeur(Request $request, Liste $liste, ValeurListe $valeur): JsonResponse
    {
        abort_unless($valeur->liste_id === $liste->id, 404);

        $validated = $request->validate([
            'code' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('valeurs_listes', 'code')->where('liste_id', $liste->id)->ignore($valeur->id)],
            'libelle' => ['sometimes', 'required', 'string', 'max:255'],
            'ordre' => ['sometimes', 'integer', 'min:0'],
            'actif' => ['sometimes', 'boolean'],
        ]);
        $before = $valeur->only(self::CHAMPS_VALEUR);

        DB::transaction(function () use ($request, $valeur, $validated, $before): void {
            $valeur->fill($validated)->save();
            $this->audit($request, 'MODIFICATION', 'valeur_liste', $valeur->id, ['avant' => $before, 'apres' => $valeur->only(self::CHAMPS_VALEUR)]);
        });

        return response()->json(['data' => $valeur->fresh()->only(self::CHAMPS_VALEUR)]);
    }

    /**
     * Nouvel ordre complet des valeurs, appliqué en une seule transaction.
     */
    public function reordonner(Request $request, Liste $liste): JsonResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['required', 'integer', 'distinct', 'exists:valeurs_listes,id'],
        ]);

        $ids = array_map('intval', $validated['ids']);
        $attendus = $liste->valeurs()->pluck('id')->map(fn ($id) => (int) $id)->sort()->values()->all();
        $recus = collect($ids)->sort()->values()->all();
        if ($recus !== $attendus) {
            throw ValidationException::withMessages(['ids' => 'L’ordre doit contenir une seule fois chaque valeur de cette liste.']);
        }

        DB::transaction(function () use ($request, $liste, $ids): void {
            foreach ($ids as $index => $id) {
                $valeur = $liste->valeurs()->findOrFail($id);
                $before = $valeur->only(self::CHAMPS_VALEUR);
                $valeur->update(['ordre' => $index + 1]);
                $this->audit($request, 'REORDONNANCEMENT', 'valeur_liste', $valeur->id, ['avant' => $before, 'apres' => $valeur->only(self::CHAMPS_VALEUR)]);
            }
        });

        return response()->json(['data' => $this->valeursOrdonnees($liste)]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function valeursOrdonnees(Liste $liste): array
    {
        return $liste->valeurs()->orderBy('ordre')->orderBy('id')->get()->map->only(self::CHAMPS_VALEUR)->all();
    }
}
