<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\PagineEtRecherche;
use App\Models\JournalAdministration;
use App\Services\TechnicalSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TechniqueController extends Controller
{
    use PagineEtRecherche;

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
            ->orderByDesc('created_at')
            ->orderByDesc('id');
        $page = $this->rechercherMots($query, $filters['q'] ?? null, fn ($search, string $motif) => $search
            ->where('operation', 'ilike', $motif)
            ->orWhere('objet', 'ilike', $motif)
            ->orWhereHas('auteur', fn ($author) => $author->where('prenom', 'ilike', $motif)->orWhere('nom', 'ilike', $motif)))
            ->paginate($filters['per_page'] ?? 25);

        return response()->json([
            'data' => collect($page->items())->map(fn (JournalAdministration $log) => [
                'id' => $log->id,
                'auteur' => $log->auteur?->nom_complet ?? 'Système',
                'operation' => $log->operation,
                'objet' => $log->objet,
                'detail' => $log->detail,
                'created_at' => $log->created_at?->toIso8601String(),
            ]),
            'meta' => $this->metaPagination($page, [
                'operations' => JournalAdministration::query()->distinct()->orderBy('operation')->pluck('operation'),
            ]),
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
