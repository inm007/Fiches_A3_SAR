<?php

namespace App\Http\Middleware;

use App\Services\ActiveProfile;
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
        if (! (new ActiveProfile($request))->is(...$roleCodes)) {
            $message = count($roleCodes) === 1
                ? (self::MESSAGES[$roleCodes[0]] ?? 'Accès interdit pour le profil actif.')
                : 'Accès interdit pour le profil actif.';

            return response()->json(['message' => $message], 403);
        }

        return $next($request);
    }
}
