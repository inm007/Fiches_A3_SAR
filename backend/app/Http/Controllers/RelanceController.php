<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesVisibleFiche;
use App\Http\Resources\FicheResource;
use App\Models\ActionA3;
use App\Models\Validation;
use App\Services\ActiveProfile;
use App\Services\RelanceService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Relance manuelle d'une action en retard ou d'une validation en attente (PRD §9).
 */
class RelanceController extends Controller
{
    use ResolvesVisibleFiche;

    public function store(Request $request, ActiveProfile $profile, RelanceService $relances): FicheResource
    {
        $data = $request->validate([
            'cible_type' => ['required', Rule::in(['action', 'validation'])],
            'cible_id' => ['required', 'integer'],
        ]);

        $cible = $data['cible_type'] === 'action'
            ? ActionA3::query()->findOrFail($data['cible_id'])
            : Validation::query()->findOrFail($data['cible_id']);
        $fiche = $this->visible($cible->fiche, $profile);

        $relances->relancer($cible, $profile);

        return new FicheResource($fiche->refresh());
    }
}
