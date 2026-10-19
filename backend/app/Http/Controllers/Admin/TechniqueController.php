<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\PagineEtRecherche;
use App\Http\Controllers\Controller;
use App\Models\JournalAdministration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Écran de l'administrateur technique (routes /api/technique) : état de la configuration
 * (lue dans .env et config/a3.php) et journal d'administration, en lecture seule.
 */
class TechniqueController extends Controller
{
    use PagineEtRecherche;

    public function index(): JsonResponse
    {
        return response()->json(['data' => [
            'auth_provider' => (string) config('a3.auth_provider'),
            'sap_enabled' => (bool) config('a3.sap_enabled'),
            'mail_mailer' => (string) config('mail.default'),
        ]]);
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
}
