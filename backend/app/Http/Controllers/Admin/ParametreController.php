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
    private const array DEFAUTS = [
        'reminder_interval_days' => 7,
        'validation_reminders_enabled' => true,
        'attachment_max_size_mb' => 10,
        'attachment_max_files' => 20,
    ];

    public function index(): JsonResponse
    {
        return response()->json(['data' => $this->valeurs()]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reminder_interval_days' => ['required', 'integer', 'min:1'],
            'validation_reminders_enabled' => ['required', 'boolean'],
            'attachment_max_size_mb' => ['required', 'integer', 'min:1'],
            'attachment_max_files' => ['required', 'integer', 'min:1'],
        ]);

        DB::transaction(function () use ($request, $validated): void {
            foreach ($validated as $cle => $valeur) {
                Parametre::query()->updateOrCreate(['cle' => $cle], ['valeur' => is_bool($valeur) ? ($valeur ? 'true' : 'false') : (string) $valeur]);
            }
            $this->audit($request, 'MODIFICATION', 'parametres', null, ['valeurs' => $validated]);
        });

        return response()->json(['data' => $this->valeurs()]);
    }

    /**
     * Valeurs enregistrées, complétées par les valeurs par défaut.
     *
     * @return array<string, int|bool>
     */
    private function valeurs(): array
    {
        $valeurs = self::DEFAUTS;
        foreach (Parametre::query()->whereIn('cle', array_keys(self::DEFAUTS))->pluck('valeur', 'cle') as $cle => $brut) {
            $valeurs[$cle] = is_bool(self::DEFAUTS[$cle])
                ? (filter_var($brut, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? self::DEFAUTS[$cle])
                : (is_numeric($brut) ? (int) $brut : self::DEFAUTS[$cle]);
        }

        return $valeurs;
    }
}
