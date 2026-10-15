<?php

namespace App\Http\Controllers;

use App\Services\TechnicalSettingsService;
use App\Models\JournalAdministration;
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

    public function logs(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'operation' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);
        $query = JournalAdministration::query()
            ->with('auteur:id,nom,prenom')
            ->when($filters['operation'] ?? null, fn ($query, string $operation) => $query->where('operation', $operation))
            ->when($filters['q'] ?? null, function ($query, string $term): void {
                foreach (preg_split('/\s+/u', trim($term), -1, PREG_SPLIT_NO_EMPTY) ?: [] as $word) {
                    $query->where(fn ($search) => $search->where('operation', 'ilike', '%'.$word.'%')
                        ->orWhere('objet', 'ilike', '%'.$word.'%')
                        ->orWhereHas('auteur', fn ($author) => $author
                            ->where('prenom', 'ilike', '%'.$word.'%')
                            ->orWhere('nom', 'ilike', '%'.$word.'%')));
                }
            })
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($filters['per_page'] ?? 25);

        return response()->json([
            'data' => collect($query->items())->map(fn (JournalAdministration $log) => [
                'id' => $log->id,
                'auteur' => $log->auteur ? trim($log->auteur->prenom.' '.$log->auteur->nom) : 'Système',
                'operation' => $log->operation,
                'objet' => $log->objet,
                'detail' => $log->detail,
                'created_at' => $log->created_at?->toIso8601String(),
            ]),
            'meta' => [
                'page' => $query->currentPage(),
                'per_page' => $query->perPage(),
                'last_page' => $query->lastPage(),
                'total' => $query->total(),
                'operations' => JournalAdministration::query()->distinct()->orderBy('operation')->pluck('operation'),
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
