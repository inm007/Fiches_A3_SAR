<?php

namespace App\Http\Controllers;

use App\Models\NotificationInterne;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Notifications internes de l'utilisateur connecté (PRD §9). Le compteur est
 * interrogé au chargement puis toutes les 60 secondes par la cloche.
 */
class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $page = NotificationInterne::query()
            ->with('fiche:id,numero_a3')
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(min((int) $request->integer('per_page', 20), 100));

        return response()->json([
            'data' => collect($page->items())->map(fn (NotificationInterne $notification) => [
                'id' => $notification->id,
                'type' => $notification->type,
                'message' => $notification->message,
                'fiche' => $notification->fiche?->only(['id', 'numero_a3']),
                'lu' => $notification->lu_le !== null,
                'created_at' => $notification->created_at?->toIso8601String(),
            ]),
            'meta' => ['page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()],
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
