<?php

namespace App\Http\Controllers\Admin;

use App\Models\Unite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Écran Unités : rien n'est supprimé, une unité se désactive.
 */
class UniteController extends AdminController
{
    private const array CHAMPS = ['code', 'libelle', 'actif'];

    public function index(): JsonResponse
    {
        return response()->json(['data' => Unite::query()->withCount(['affectations', 'equipements'])->orderBy('libelle')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:255', 'unique:unites,code'],
            'libelle' => ['required', 'string', 'max:255'],
            'actif' => ['sometimes', 'boolean'],
        ]);

        $unite = DB::transaction(function () use ($request, $validated): Unite {
            $unite = Unite::create([...$validated, 'actif' => $validated['actif'] ?? true]);
            $this->audit($request, 'CREATION', 'unite', $unite->id, $unite->only(self::CHAMPS));

            return $unite;
        });

        return response()->json(['data' => $unite], 201);
    }

    public function update(Request $request, Unite $unite): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('unites', 'code')->ignore($unite->id)],
            'libelle' => ['sometimes', 'required', 'string', 'max:255'],
            'actif' => ['sometimes', 'boolean'],
        ]);
        $before = $unite->only(self::CHAMPS);

        DB::transaction(function () use ($request, $unite, $validated, $before): void {
            $unite->fill($validated)->save();
            $this->audit($request, 'MODIFICATION', 'unite', $unite->id, ['avant' => $before, 'apres' => $unite->only(self::CHAMPS)]);
        });

        return response()->json(['data' => $unite->fresh()->loadCount(['affectations', 'equipements'])]);
    }
}
