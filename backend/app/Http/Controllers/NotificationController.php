<?php

namespace App\Http\Controllers;

use App\Models\NotificationInterne;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Notifications internes de l'utilisateur connecté (PRD §9). Le compteur est
 * interrogé au chargement puis toutes les 60 secondes par la cloche.
 */
class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'etat' => ['nullable', Rule::in(['lu', 'non_lu'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $userNotifications = NotificationInterne::where('user_id', $request->user()->id);
        $unreadTotal = (clone $userNotifications)->whereNull('lu_le')->count();

        $query = $userNotifications
            ->with('fiche:id,numero_a3')
            ->when($filters['q'] ?? null, function ($query, string $term): void {
                foreach (preg_split('/\s+/u', trim($term), -1, PREG_SPLIT_NO_EMPTY) ?: [] as $word) {
                    $query->where(fn ($search) => $search->where('message', 'ilike', '%'.$word.'%')
                        ->orWhereHas('fiche', fn ($fiche) => $fiche->where('numero_a3', 'ilike', '%'.$word.'%')));
                }
            })
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
                'created_at' => $notification->created_at?->toIso8601String(),
            ]),
            'meta' => ['page' => $page->currentPage(), 'per_page' => $page->perPage(), 'last_page' => $page->lastPage(), 'total' => $page->total(), 'unread_total' => $unreadTotal],
        ]);
    }

    public function nonLues(Request $request): JsonResponse
    {
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
