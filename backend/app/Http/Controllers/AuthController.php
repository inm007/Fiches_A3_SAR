<?php

namespace App\Http\Controllers;

use App\Models\Affectation;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Politique de mot de passe : 8 caractères minimum, au moins une majuscule et un chiffre.
     */
    private const array PASSWORD_RULES = ['min:8', 'regex:/[A-Z]/', 'regex:/[0-9]/'];

    private const array PASSWORD_MESSAGES = [
        'password.min' => 'Le mot de passe doit contenir au moins 8 caractères.',
        'password.regex' => 'Le mot de passe doit contenir au moins une majuscule et un chiffre.',
        'password.confirmed' => 'La confirmation ne correspond pas au mot de passe.',
    ];

    private const int MAX_ATTEMPTS = 5;

    private const int DECAY_SECONDS = 900;

    private const int PASSWORD_RESET_LIMIT = 3;

    private const int PASSWORD_RESET_WINDOW = 3600;

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'identifiant' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        [$identifierKey, $addressKey] = $this->limiterKeys($credentials['identifiant'], $request);
        $retryAfter = max(
            RateLimiter::availableIn($identifierKey),
            RateLimiter::availableIn($addressKey),
        );

        if (RateLimiter::tooManyAttempts($identifierKey, self::MAX_ATTEMPTS)
            || RateLimiter::tooManyAttempts($addressKey, self::MAX_ATTEMPTS)) {
            return response()->json([
                'message' => 'Trop de tentatives. Réessayez dans '.max(1, (int) ceil($retryAfter / 60)).' minutes.',
                'retry_after' => $retryAfter,
            ], 429)->header('Retry-After', (string) $retryAfter);
        }

        $authenticated = Auth::guard('web')->attempt([
            'identifiant' => $credentials['identifiant'],
            'password' => $credentials['password'],
            'actif' => true,
            'auth_source' => 'local',
        ]);

        if (! $authenticated) {
            $this->recordFailedAttempt($identifierKey, $addressKey);

            return $this->invalidCredentials();
        }

        /** @var User $user */
        $user = Auth::guard('web')->user();
        $assignments = $this->activeAssignments($user);
        $activeAssignment = $assignments->first();

        if (! $activeAssignment) {
            $this->fermerSession($request);
            $this->recordFailedAttempt($identifierKey, $addressKey);

            return $this->invalidCredentials();
        }

        RateLimiter::clear($identifierKey);
        RateLimiter::clear($addressKey);
        $request->session()->regenerate();
        $request->session()->put('auth.active_assignment_id', $activeAssignment->id);
        $user->forceFill(['derniere_connexion' => now()])->save();

        return response()->json($this->authPayload($user, $assignments, $activeAssignment));
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $assignments = $this->activeAssignments($user);
        $activeAssignmentId = $request->session()->get('auth.active_assignment_id');
        $activeAssignment = $assignments->firstWhere('id', $activeAssignmentId)
            ?? $assignments->first();

        if (! $user->actif || ! $activeAssignment) {
            $this->fermerSession($request);

            return response()->json(['message' => 'Session expirée. Reconnectez-vous.'], 401);
        }

        $request->session()->put('auth.active_assignment_id', $activeAssignment->id);

        return response()->json($this->authPayload($user, $assignments, $activeAssignment));
    }

    public function switchProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'affectation_id' => ['required', 'integer'],
        ]);

        /** @var User $user */
        $user = $request->user();
        $assignments = $this->activeAssignments($user);
        $activeAssignment = $assignments->firstWhere('id', (int) $validated['affectation_id']);

        if (! $activeAssignment) {
            throw ValidationException::withMessages([
                'affectation_id' => ['Cette affectation n’est pas disponible.'],
            ]);
        }

        $request->session()->put('auth.active_assignment_id', $activeAssignment->id);

        return response()->json($this->authPayload($user, $assignments, $activeAssignment));
    }

    public function logout(Request $request): JsonResponse
    {
        $this->fermerSession($request);

        return response()->json(['message' => 'Déconnexion réussie.']);
    }

    public function requestPasswordReset(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'account' => ['required', 'string', 'max:255'],
        ]);
        $account = Str::lower(trim($validated['account']));
        $limiterKey = self::passwordResetKey($account);
        $response = [
            'message' => 'Si un compte local actif correspond à ces informations, un lien sera envoyé.',
        ];

        if (RateLimiter::tooManyAttempts($limiterKey, self::PASSWORD_RESET_LIMIT)) {
            return response()->json($response, 202);
        }
        RateLimiter::hit($limiterKey, self::PASSWORD_RESET_WINDOW);

        $user = User::query()
            ->where('actif', true)
            ->where('auth_source', 'local')
            ->where(fn ($query) => $query->whereRaw('LOWER(email) = ?', [$account])
                ->orWhereRaw('LOWER(identifiant) = ?', [$account]))
            ->first();

        if ($user) {
            $emailLimiterKey = self::passwordResetKey($user->email);
            if ($emailLimiterKey !== $limiterKey) {
                if (RateLimiter::tooManyAttempts($emailLimiterKey, self::PASSWORD_RESET_LIMIT)) {
                    return response()->json($response, 202);
                }
                RateLimiter::hit($emailLimiterKey, self::PASSWORD_RESET_WINDOW);
            }

            try {
                Password::broker()->sendResetLink(['email' => $user->email]);
            } catch (\Throwable $exception) {
                report($exception);
            }
        }

        return response()->json($response, 202);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'confirmed', ...self::PASSWORD_RULES],
        ], self::PASSWORD_MESSAGES);
        $user = User::query()
            ->where('email', $validated['email'])
            ->where('actif', true)
            ->where('auth_source', 'local')
            ->first();

        if (! $user) {
            return response()->json(['message' => 'Ce lien est invalide ou expiré.'], 422);
        }

        $status = Password::broker()->reset(
            $validated,
            function (User $resetUser, string $password): void {
                $resetUser->forceFill(['password' => $password]);
                $resetUser->setRememberToken(Str::random(60));
                $resetUser->save();
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'Ce lien est invalide ou expiré. Demandez un nouveau lien.',
                'status' => $status,
            ], 422);
        }

        return response()->json(['message' => 'Le mot de passe a été défini. Vous pouvez vous connecter.']);
    }

    /**
     * Clé de limitation des liens de mot de passe d'un compte (3 par heure), partagée
     * avec l'envoi par l'administrateur fonctionnel.
     */
    public static function passwordResetKey(string $account): string
    {
        return 'auth:password-reset:'.hash('sha256', Str::lower(trim($account)));
    }

    private function fermerSession(Request $request): void
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function limiterKeys(string $identifier, Request $request): array
    {
        return [
            'auth:login:identifier:'.Str::lower($identifier),
            'auth:login:address:'.$request->ip(),
        ];
    }

    private function recordFailedAttempt(string $identifierKey, string $addressKey): void
    {
        RateLimiter::hit($identifierKey, self::DECAY_SECONDS);
        RateLimiter::hit($addressKey, self::DECAY_SECONDS);
    }

    private function invalidCredentials(): JsonResponse
    {
        return response()->json([
            'message' => 'Identifiant ou mot de passe incorrect.',
        ], 401);
    }

    /**
     * @return Collection<int, Affectation>
     */
    private function activeAssignments(User $user): Collection
    {
        return $user->affectations()
            ->with(['role:id,code,libelle', 'unite:id,code,libelle'])
            ->enCours()
            ->orderBy('id')
            ->get();
    }

    /**
     * @param  Collection<int, Affectation>  $assignments
     * @return array<string, mixed>
     */
    private function authPayload(User $user, Collection $assignments, Affectation $activeAssignment): array
    {
        $profiles = $assignments->map(fn (Affectation $assignment): array => $this->profilePayload($assignment))->all();
        $activeProfile = $this->profilePayload($activeAssignment);

        return [
            'user' => [
                'id' => $user->id,
                'identifiant' => $user->identifiant,
                'prenom' => $user->prenom,
                'nom' => $user->nom,
                'email' => $user->email,
            ],
            'profil_actif' => $activeProfile,
            'profils' => $profiles,
            'redirect_to' => $activeProfile['redirect_to'],
        ];
    }

    /**
     * @return array<string, int|string|null>
     */
    private function profilePayload(Affectation $assignment): array
    {
        return [
            'affectation_id' => $assignment->id,
            'role_code' => $assignment->role->code,
            'role' => $assignment->role->libelle,
            'unite' => $assignment->unite?->libelle,
            'label' => $assignment->role->libelle.($assignment->unite ? ' — '.$assignment->unite->libelle : ''),
            'redirect_to' => $assignment->role->code === 'ADMIN_TECHNIQUE'
                ? '/technique'
                : '/tableau-de-bord',
        ];
    }
}
