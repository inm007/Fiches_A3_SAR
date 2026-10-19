<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\RegleMetierException;
use App\Http\Controllers\AuthController;
use App\Models\Affectation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Écran Utilisateurs : comptes métier créés sans mot de passe, puis lien de définition.
 */
class UserController extends AdminController
{
    public function index(): JsonResponse
    {
        $users = User::query()
            ->with(['affectations.role:id,code,libelle', 'affectations.unite:id,code,libelle'])
            ->orderBy('nom')
            ->orderBy('prenom')
            ->get();

        return response()->json(['data' => $users->map(fn (User $user) => $this->userData($user))]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'identifiant' => ['required', 'string', 'max:255', 'unique:users,identifiant'],
            'nom' => ['required', 'string', 'max:255'],
            'prenom' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'auth_source' => ['sometimes', Rule::in(['local', 'ldap'])],
            'ldap_dn' => ['nullable', 'string', 'max:255', 'unique:users,ldap_dn'],
            'actif' => ['sometimes', 'boolean'],
        ]);
        $this->validerSourceLdap($validated['auth_source'] ?? 'local', $validated['ldap_dn'] ?? null);

        $user = DB::transaction(function () use ($validated, $request): User {
            $user = User::create([
                ...$validated,
                'auth_source' => $validated['auth_source'] ?? 'local',
                'actif' => $validated['actif'] ?? true,
                'password' => null,
            ]);
            $this->audit($request, 'CREATION', 'user', $user->id, $this->auditData($user));

            return $user;
        });

        return response()->json(['data' => [
            ...$this->userData($user->load(['affectations.role', 'affectations.unite'])),
            'lien_envoye' => $this->envoyerLienCreation($request, $user),
        ]], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'identifiant' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('users', 'identifiant')->ignore($user->id)],
            'nom' => ['sometimes', 'required', 'string', 'max:255'],
            'prenom' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'auth_source' => ['sometimes', 'required', Rule::in(['local', 'ldap'])],
            'ldap_dn' => ['sometimes', 'nullable', 'string', 'max:255', Rule::unique('users', 'ldap_dn')->ignore($user->id)],
            'actif' => ['sometimes', 'boolean'],
        ]);

        $authSource = $validated['auth_source'] ?? $user->auth_source;
        $this->validerSourceLdap($authSource, array_key_exists('ldap_dn', $validated) ? $validated['ldap_dn'] : $user->ldap_dn);
        $before = $this->auditData($user);

        DB::transaction(function () use ($request, $user, $validated, $before, $authSource): void {
            $sourceChanged = $authSource !== $user->auth_source;
            $user->fill($validated);
            if ($sourceChanged) {
                $user->password = null;
            }
            $user->save();
            $this->audit($request, 'MODIFICATION', 'user', $user->id, ['avant' => $before, 'apres' => $this->auditData($user)]);
        });

        return response()->json(['data' => $this->userData($user->fresh()->load(['affectations.role', 'affectations.unite']))]);
    }

    /**
     * Envoie le lien de définition ou de réinitialisation du mot de passe (3 par heure et par compte).
     */
    public function sendPasswordLink(Request $request, User $user): JsonResponse
    {
        if (! $user->actif) {
            throw new RegleMetierException('Un compte désactivé ne peut pas recevoir de lien.');
        }
        if ($user->auth_source !== 'local') {
            throw new RegleMetierException('Un lien ne peut être envoyé qu’à un compte local.');
        }

        $limiterKey = AuthController::passwordResetKey($user->email);
        if (RateLimiter::tooManyAttempts($limiterKey, 3)) {
            $retryAfter = RateLimiter::availableIn($limiterKey);

            return response()->json([
                'message' => 'La limite de trois liens par heure pour ce compte est atteinte.',
                'retry_after' => $retryAfter,
            ], 429)->header('Retry-After', (string) $retryAfter);
        }
        RateLimiter::hit($limiterKey, 3600);

        try {
            $status = Password::broker()->sendResetLink(['email' => $user->email]);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json(['message' => 'Le courriel de réinitialisation n’a pas pu être envoyé.'], 502);
        }

        if ($status !== Password::RESET_LINK_SENT) {
            $throttled = $status === Password::RESET_THROTTLED;

            return response()->json([
                'message' => $throttled ? 'Un lien a déjà été demandé récemment.' : 'Le lien de réinitialisation n’a pas pu être créé.',
                'status' => $status,
            ], $throttled ? 429 : 422);
        }

        $this->audit($request, 'ENVOI_LIEN_MOT_DE_PASSE', 'user', $user->id, ['email' => $user->email]);

        return response()->json(['data' => ['message' => 'Le lien de réinitialisation a été envoyé.']]);
    }

    /**
     * Un nouveau compte local et actif reçoit aussitôt son lien de définition du mot de passe
     * (PRD §13.1). Un échec d'envoi ne bloque pas la création : l'administrateur renvoie le lien.
     */
    private function envoyerLienCreation(Request $request, User $user): bool
    {
        if (! $user->actif || $user->auth_source !== 'local') {
            return false;
        }

        try {
            $envoye = Password::broker()->sendResetLink(['email' => $user->email]) === Password::RESET_LINK_SENT;
        } catch (Throwable $exception) {
            report($exception);

            return false;
        }

        if ($envoye) {
            RateLimiter::hit(AuthController::passwordResetKey($user->email), 3600);
            $this->audit($request, 'ENVOI_LIEN_MOT_DE_PASSE', 'user', $user->id, ['email' => $user->email, 'creation' => true]);
        }

        return $envoye;
    }

    /**
     * Un compte annuaire porte un identifiant LDAP ; un compte local n'en a pas.
     */
    private function validerSourceLdap(string $authSource, ?string $ldapDn): void
    {
        if ($authSource === 'ldap' && ! $ldapDn) {
            throw ValidationException::withMessages(['ldap_dn' => 'Un compte annuaire doit avoir un identifiant LDAP.']);
        }
        if ($authSource === 'local' && $ldapDn) {
            throw ValidationException::withMessages(['ldap_dn' => 'Un compte local ne peut pas avoir d’identifiant LDAP.']);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function userData(User $user): array
    {
        return [
            ...$user->only(['id', 'identifiant', 'nom', 'prenom', 'email', 'auth_source', 'ldap_dn', 'actif', 'derniere_connexion']),
            'affectations' => $user->affectations->map(fn (Affectation $affectation) => $this->affectationData($affectation))->values(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function auditData(User $user): array
    {
        return $user->only(['identifiant', 'nom', 'prenom', 'email', 'auth_source', 'ldap_dn', 'actif']);
    }
}
