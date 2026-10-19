<?php

namespace App\Http\Controllers\Admin;

use App\Models\Equipement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Écran Équipements : référence SAP saisie à la main (point d'extension SAP).
 */
class EquipementController extends AdminController
{
    private const array CHAMPS = ['code', 'libelle', 'reference_sap', 'unite_id', 'actif'];

    public function index(): JsonResponse
    {
        return response()->json(['data' => Equipement::query()->with('unite:id,code,libelle')->orderBy('libelle')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:255', 'unique:equipements,code'],
            'libelle' => ['required', 'string', 'max:255'],
            'reference_sap' => ['sometimes', 'nullable', 'string', 'max:255'],
            'unite_id' => ['sometimes', 'nullable', 'integer', 'exists:unites,id'],
            'actif' => ['sometimes', 'boolean'],
        ]);
        $this->validerUniteActive($validated['unite_id'] ?? null);

        $equipement = DB::transaction(function () use ($request, $validated): Equipement {
            $equipement = Equipement::create([...$validated, 'actif' => $validated['actif'] ?? true]);
            $this->audit($request, 'CREATION', 'equipement', $equipement->id, $equipement->only(self::CHAMPS));

            return $equipement;
        });

        return response()->json(['data' => $equipement->load('unite:id,code,libelle')], 201);
    }

    public function update(Request $request, Equipement $equipement): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('equipements', 'code')->ignore($equipement->id)],
            'libelle' => ['sometimes', 'required', 'string', 'max:255'],
            'reference_sap' => ['sometimes', 'nullable', 'string', 'max:255'],
            'unite_id' => ['sometimes', 'nullable', 'integer', 'exists:unites,id'],
            'actif' => ['sometimes', 'boolean'],
        ]);
        if (array_key_exists('unite_id', $validated)) {
            $this->validerUniteActive($validated['unite_id']);
        }
        $before = $equipement->only(self::CHAMPS);

        DB::transaction(function () use ($request, $equipement, $validated, $before): void {
            $equipement->fill($validated)->save();
            $this->audit($request, 'MODIFICATION', 'equipement', $equipement->id, ['avant' => $before, 'apres' => $equipement->only(self::CHAMPS)]);
        });

        return response()->json(['data' => $equipement->fresh()->load('unite:id,code,libelle')]);
    }
}
