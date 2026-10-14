<?php

namespace App\Http\Controllers;

use App\Services\TechnicalSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TechniqueController extends Controller
{
    public function __construct(
        protected TechnicalSettingsService $settingsService
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => [
                ...$this->settingsService->overview(),
                'logs' => $this->settingsService->getTechnicalLogs(),
            ],
        ]);
    }

    public function updateSetting(Request $request): JsonResponse
    {
        $request->validate([
            'cle' => ['required', 'string', Rule::in(array_keys(TechnicalSettingsService::SMTP_RULES))],
        ]);

        $key = $request->string('cle')->toString();
        $validated = $request->validate([
            'valeur' => TechnicalSettingsService::SMTP_RULES[$key],
        ]);

        $value = $validated['valeur'] ?? null;
        $this->settingsService->updateSetting($request->user(), $key, $value === null ? null : (string) $value);

        return response()->json(['message' => 'Paramètre mis à jour.']);
    }
}
