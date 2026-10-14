<?php

namespace App\Http\Middleware;

use App\Models\Affectation;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Autorise la requête seulement si l'affectation active en session
 * (auth.active_assignment_id) est valide et porte l'un des rôles attendus.
 *
 * Usage : EnsureActiveRole::class.':ADMIN_FONCTIONNEL'
 */
class EnsureActiveRole
{
    private const array MESSAGES = [
        'ADMIN_FONCTIONNEL' => 'Accès réservé à l’administrateur fonctionnel du profil actif.',
        'ADMIN_TECHNIQUE' => 'Accès réservé à l’administrateur technique du profil actif.',
    ];

    public function handle(Request $request, Closure $next, string ...$roleCodes): Response
    {
        $user = $request->user();
        $assignmentId = $request->hasSession()
            ? $request->session()->get('auth.active_assignment_id')
            : null;

        $isAllowed = $user
            && $user->actif
            && $assignmentId
            && Affectation::query()
                ->whereKey($assignmentId)
                ->where('user_id', $user->id)
                ->where('actif', true)
                ->where(fn ($query) => $query->whereNull('date_debut')->orWhere('date_debut', '<=', now()))
                ->where(fn ($query) => $query->whereNull('date_fin')->orWhere('date_fin', '>=', now()))
                ->whereHas('role', fn ($query) => $query->whereIn('code', $roleCodes))
                ->exists();

        if (! $isAllowed) {
            $message = count($roleCodes) === 1
                ? (self::MESSAGES[$roleCodes[0]] ?? 'Accès interdit pour le profil actif.')
                : 'Accès interdit pour le profil actif.';

            return response()->json(['message' => $message], 403);
        }

        return $next($request);
    }
}
