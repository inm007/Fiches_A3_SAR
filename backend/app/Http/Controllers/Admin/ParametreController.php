<?php

namespace App\Http\Controllers\Admin;

use App\Models\Parametre;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Écran Paramètres fonctionnels : cadence des rappels et limites des pièces jointes.
 */
class ParametreController extends AdminController
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Parametre::fonctionnels()]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reminder_interval_days' => ['required', 'integer', 'min:1'],
            'validation_reminders_enabled' => ['required', 'boolean'],
            'due_soon_days' => ['required', 'integer', 'min:1', 'max:30'],
            'attachment_max_size_mb' => ['required', 'integer', 'min:1'],
            'attachment_max_files' => ['required', 'integer', 'min:1'],
        ]);

        DB::transaction(function () use ($request, $validated): void {
            foreach ($validated as $cle => $valeur) {
                Parametre::query()->updateOrCreate(['cle' => $cle], ['valeur' => is_bool($valeur) ? ($valeur ? 'true' : 'false') : (string) $valeur]);
            }
            $this->audit($request, 'MODIFICATION', 'parametres', null, ['valeurs' => $validated]);
        });

        return response()->json(['data' => Parametre::fonctionnels()]);
    }
}
