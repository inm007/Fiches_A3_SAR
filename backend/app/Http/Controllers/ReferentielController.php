<?php

namespace App\Http\Controllers;

use App\Models\Equipement;
use App\Models\Liste;
use App\Models\Unite;
use Illuminate\Http\JsonResponse;

/**
 * Listes de choix actives, unités et équipements pour les formulaires (PRD §4.3).
 */
class ReferentielController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => [
            'listes' => Liste::query()
                ->with(['valeurs' => fn ($query) => $query->where('actif', true)->orderBy('ordre')])
                ->get()
                ->mapWithKeys(fn (Liste $liste) => [$liste->code => $liste->valeurs->map->only(['id', 'code', 'libelle'])->values()]),
            'unites' => Unite::where('actif', true)->orderBy('libelle')->get(['id', 'code', 'libelle']),
            'equipements' => Equipement::where('actif', true)->orderBy('code')->get(['id', 'unite_id', 'code', 'libelle']),
        ]]);
    }
}
