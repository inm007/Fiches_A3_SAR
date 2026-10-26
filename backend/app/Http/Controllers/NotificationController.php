<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\PagineEtRecherche;
use App\Models\NotificationInterne;
use App\Services\NotificationCloture;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Notifications internes de l'utilisateur connecté (PRD §9). Le compteur est
 * interrogé au chargement puis toutes les 60 secondes par la cloche.
 */
class NotificationController extends Controller
{
    use PagineEtRecherche;

    public function index(Request $request, NotificationCloture $cloture): JsonResponse
    {
        $cloture->marquerTraitees($request->user()->id);

        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'etat' => ['nullable', Rule::in(['lu', 'non_lu'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $userNotifications = NotificationInterne::where('user_id', $request->user()->id);
        $unreadTotal = (clone $userNotifications)->whereNull('lu_le')->count();

        $query = $this->rechercherMots($userNotifications->with('fiche:id,numero_a3'), $filters['q'] ?? null, fn ($search, string $motif) => $search
            ->where('message', 'ilike', $motif)
            ->orWhereHas('fiche', fn ($fiche) => $fiche->where('numero_a3', 'ilike', $motif)))
            ->when(($filters['etat'] ?? null) === 'lu', fn ($query) => $query->whereNotNull('lu_le'))
            ->when(($filters['etat'] ?? null) === 'non_lu', fn ($query) => $query->whereNull('lu_le'))
            ->orderByDesc('created_at')
            ->orderByDesc('id');
        $page = $query->paginate($filters['per_page'] ?? 20);

        return response()->json([
            'data' => collect($page->items())->map(fn (NotificationInterne $notification) => [
                'id' => $notification->id,
                'type' => $notification->type,
                'message' => $notification->message,
                'fiche' => $notification->fiche?->only(['id', 'numero_a3']),
                'lu' => $notification->lu_le !== null,
                'traite' => $notification->traite_le !== null,
                'created_at' => $notification->created_at?->toIso8601String(),
            ]),
            'meta' => $this->metaPagination($page, ['unread_total' => $unreadTotal]),
        ]);
    }

    public function nonLues(Request $request, NotificationCloture $cloture): JsonResponse
    {
        $cloture->marquerTraitees($request->user()->id);

        return response()->json(['data' => [
            'count' => NotificationInterne::where('user_id', $request->user()->id)->whereNull('lu_le')->count(),
        ]]);
    }

    public function marquerLue(Request $request, NotificationInterne $notification): JsonResponse
    {
        abort_unless($notification->user_id === $request->user()->id, 404);
        $notification->lu_le ??= now();
        $notification->save();

        return response()->json(['data' => ['id' => $notification->id, 'lu' => true]]);
    }

    public function toutMarquerLu(Request $request): JsonResponse
    {
        $count = NotificationInterne::where('user_id', $request->user()->id)->whereNull('lu_le')->update(['lu_le' => now()]);

        return response()->json(['data' => ['count' => $count]]);
    }
}
