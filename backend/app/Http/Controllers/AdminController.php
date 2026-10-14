<?php

namespace App\Http\Controllers;

use App\Models\Affectation;
use App\Models\Equipement;
use App\Models\FicheA3;
use App\Models\JournalAdministration;
use App\Models\Liste;
use App\Models\Parametre;
use App\Models\Role;
use App\Models\Unite;
use App\Models\User;
use App\Models\ValeurListe;
use App\Services\HistoryLogger;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

class AdminController extends Controller
{
    private const array SCOPED_ROLE_CODES = ['AGENT', 'PILOTE', 'VALIDEUR_PRODUCTION', 'VALIDEUR_HSE', 'VALIDEUR_PROCEDE', 'VALIDEUR_MAINTENANCE', 'VALIDEUR_INSPECTION'];

    private const array SETTINGS_DEFAULTS = [
        'reminder_interval_days' => 7,
        'validation_reminders_enabled' => true,
        'attachment_max_size_mb' => 10,
        'attachment_max_files' => 20,
    ];

    public function roles(): JsonResponse
    {
        return response()->json([
            'data' => Role::query()
                ->orderBy('id')
                ->get(['id', 'code', 'libelle']),
        ]);
    }

    public function fiches(): JsonResponse
    {
        $fiches = FicheA3::query()
            ->with(['unite:id,code,libelle', 'pilote:id,identifiant,nom,prenom,actif'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $fiches->map(fn (FicheA3 $fiche) => $this->ficheAdminData($fiche))]);
    }

    public function updateFicheAdministration(Request $request, FicheA3 $fiche): JsonResponse
    {
        $validated = $request->validate([
            'pilote_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'confidentialite' => ['sometimes', 'required', Rule::in(['NORMAL', 'RESTREINT'])],
        ]);

        if ($validated === []) {
            throw ValidationException::withMessages([
                'fiche' => ['Aucune modification autorisée n’a été fournie.'],
            ]);
        }

        if (array_key_exists('pilote_id', $validated)) {
            if ($fiche->statut_etape !== 'OUVERT' && (int) $validated['pilote_id'] !== (int) $fiche->pilote_id) {
                throw ValidationException::withMessages([
                    'pilote_id' => ['Le pilote ne peut être désigné que lorsque la fiche est à l’étape Ouvert.'],
                ]);
            }

            $isAssignedPilot = $validated['pilote_id'] === null || User::query()
                ->whereKey($validated['pilote_id'])
                ->where('actif', true)
                ->whereHas('affectations', function ($query) use ($fiche): void {
                    $query->where('unite_id', $fiche->unite_id)
                        ->where('actif', true)
                        ->where(fn ($assignment) => $assignment->whereNull('date_debut')->orWhere('date_debut', '<=', now()))
                        ->where(fn ($assignment) => $assignment->whereNull('date_fin')->orWhere('date_fin', '>=', now()))
                        ->whereHas('role', fn ($role) => $role->where('code', 'PILOTE'));
                })
                ->exists();

            if (! $isAssignedPilot) {
                throw ValidationException::withMessages([
                    'pilote_id' => ['Le pilote doit avoir une affectation active dans l’unité de la fiche.'],
                ]);
            }
        }

        $before = $fiche->only(['pilote_id', 'confidentialite']);
        DB::transaction(function () use ($request, $fiche, $validated, $before): void {
            $fiche->fill($validated)->save();
            $this->audit($request, 'MODIFICATION_ADMIN_FONCTIONNELLE', 'fiche_a3', $fiche->id, [
                'avant' => $before,
                'apres' => $fiche->only(['pilote_id', 'confidentialite']),
            ]);

            $history = app(HistoryLogger::class);
            $authorId = $request->user()->id;
            if ($fiche->wasChanged('pilote_id')) {
                $history->log($fiche, $authorId, 'DESIGNATION_PILOTE', 'pilote_id', $before['pilote_id'], $fiche->pilote_id);
                app(NotificationService::class)->notify([$fiche->pilote_id], $fiche, 'DESIGNATION_PILOTE', 'Vous êtes désigné pilote de cette fiche.', auteurId: $authorId);
            }
            if ($fiche->wasChanged('confidentialite')) {
                $history->log($fiche, $authorId, 'CHANGEMENT_CONFIDENTIALITE', 'confidentialite', $before['confidentialite'], $fiche->confidentialite);
            }
        });

        return response()->json([
            'data' => $this->ficheAdminData($fiche->fresh()->load(['unite:id,code,libelle', 'pilote:id,identifiant,nom,prenom,actif'])),
        ]);
    }

    public function users(): JsonResponse
    {
        $users = User::query()
            ->with(['affectations.role:id,code,libelle', 'affectations.unite:id,code,libelle'])
            ->orderBy('nom')
            ->orderBy('prenom')
            ->get();

        return response()->json(['data' => $users->map(fn (User $user) => $this->userData($user))]);
    }

    public function createUser(Request $request): JsonResponse
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

        $authSource = $validated['auth_source'] ?? 'local';
        if (($authSource === 'ldap' && empty($validated['ldap_dn']))
            || ($authSource === 'local' && ! empty($validated['ldap_dn']))) {
            throw ValidationException::withMessages([
                'ldap_dn' => [$authSource === 'ldap'
                    ? 'Un compte annuaire doit avoir un identifiant LDAP.'
                    : 'Un compte local ne peut pas avoir d’identifiant LDAP.'],
            ]);
        }

        $user = DB::transaction(function () use ($validated, $request): User {
            $user = User::create([
                ...$validated,
                'auth_source' => $validated['auth_source'] ?? 'local',
                'actif' => $validated['actif'] ?? true,
                'password' => null,
            ]);
            $this->audit($request, 'CREATION', 'user', $user->id, $this->userAuditData($user));

            return $user;
        });

        return response()->json(['data' => $this->userData($user->load(['affectations.role', 'affectations.unite']))], 201);
    }

    public function updateUser(Request $request, User $user): JsonResponse
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

        $before = $this->userAuditData($user);
        $authSource = $validated['auth_source'] ?? $user->auth_source;
        $ldapDn = array_key_exists('ldap_dn', $validated) ? $validated['ldap_dn'] : $user->ldap_dn;
        if (($authSource === 'ldap' && ! $ldapDn) || ($authSource === 'local' && $ldapDn)) {
            throw ValidationException::withMessages([
                'ldap_dn' => [$authSource === 'ldap'
                    ? 'Un compte annuaire doit avoir un identifiant LDAP.'
                    : 'Un compte local ne peut pas avoir d’identifiant LDAP.'],
            ]);
        }
        $authSourceChanged = $authSource !== $user->auth_source;
        DB::transaction(function () use ($request, $user, $validated, $before, $authSourceChanged): void {
            $user->fill($validated);
            if ($authSourceChanged) {
                $user->password = null;
            }
            $user->save();
            $this->audit($request, 'MODIFICATION', 'user', $user->id, ['avant' => $before, 'apres' => $this->userAuditData($user)]);
        });

        return response()->json(['data' => $this->userData($user->fresh()->load(['affectations.role', 'affectations.unite']))]);
    }

    public function sendPasswordLink(Request $request, User $user): JsonResponse
    {
        if (! $user->actif) {
            return response()->json(['message' => 'Un compte désactivé ne peut pas recevoir de lien.'], 422);
        }

        if ($user->auth_source !== 'local') {
            return response()->json(['message' => 'Un lien ne peut être envoyé qu’à un compte local.'], 422);
        }

        $limiterKey = 'auth:password-reset:'.hash('sha256', Str::lower($user->email));
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

            return response()->json([
                'message' => 'Le courriel de réinitialisation n’a pas pu être envoyé.',
            ], 502);
        }

        if ($status !== Password::RESET_LINK_SENT) {
            return response()->json([
                'message' => $status === Password::RESET_THROTTLED
                    ? 'Un lien a déjà été demandé récemment.'
                    : 'Le lien de réinitialisation n’a pas pu être créé.',
                'status' => $status,
            ], $status === Password::RESET_THROTTLED ? 429 : 422);
        }

        $this->audit($request, 'ENVOI_LIEN_MOT_DE_PASSE', 'user', $user->id, ['email' => $user->email]);

        return response()->json(['data' => ['message' => 'Le lien de réinitialisation a été envoyé.']]);
    }

    public function assignments(): JsonResponse
    {
        $assignments = Affectation::query()
            ->with(['user:id,identifiant,nom,prenom,email,actif', 'role:id,code,libelle', 'unite:id,code,libelle'])
            ->orderBy('id')
            ->get();

        return response()->json(['data' => $assignments->map(fn (Affectation $assignment) => $this->assignmentData($assignment))]);
    }

    public function createAssignment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'role_id' => ['required', 'integer', 'exists:roles,id'],
            'unite_id' => ['present', 'nullable', 'integer', 'exists:unites,id'],
            'actif' => ['sometimes', 'boolean'],
            'date_debut' => ['sometimes', 'nullable', 'date'],
            'date_fin' => ['sometimes', 'nullable', 'date'],
        ]);
        $this->validateAssignmentScope((int) $validated['role_id'], $validated['unite_id'] ?? null);
        $this->validateAssignmentDates($validated['date_debut'] ?? null, $validated['date_fin'] ?? null);
        $this->assertUniqueAssignment((int) $validated['user_id'], (int) $validated['role_id'], $validated['unite_id'] ?? null);

        $assignment = DB::transaction(function () use ($request, $validated): Affectation {
            $assignment = Affectation::create([
                ...$validated,
                'actif' => $validated['actif'] ?? true,
            ]);
            $this->audit($request, 'CREATION', 'affectation', $assignment->id, $this->assignmentAuditData($assignment));

            return $assignment;
        });

        return response()->json(['data' => $this->assignmentData($assignment->load(['user', 'role', 'unite']))], 201);
    }

    public function updateAssignment(Request $request, Affectation $affectation): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => ['sometimes', 'required', 'integer', 'exists:users,id'],
            'role_id' => ['sometimes', 'required', 'integer', 'exists:roles,id'],
            'unite_id' => ['sometimes', 'nullable', 'integer', 'exists:unites,id'],
            'actif' => ['sometimes', 'boolean'],
            'date_debut' => ['sometimes', 'nullable', 'date'],
            'date_fin' => ['sometimes', 'nullable', 'date'],
        ]);
        $userId = (int) ($validated['user_id'] ?? $affectation->user_id);
        $roleId = (int) ($validated['role_id'] ?? $affectation->role_id);
        $unitId = array_key_exists('unite_id', $validated) ? $validated['unite_id'] : $affectation->unite_id;
        $this->validateAssignmentScope(
            $roleId,
            $unitId,
            array_key_exists('role_id', $validated) || array_key_exists('unite_id', $validated),
        );
        $this->validateAssignmentDates(
            array_key_exists('date_debut', $validated) ? $validated['date_debut'] : $affectation->date_debut?->toDateTimeString(),
            array_key_exists('date_fin', $validated) ? $validated['date_fin'] : $affectation->date_fin?->toDateTimeString(),
        );
        $this->assertUniqueAssignment($userId, $roleId, $unitId, $affectation->id);

        $before = $this->assignmentAuditData($affectation);
        DB::transaction(function () use ($request, $affectation, $validated, $before): void {
            $affectation->fill($validated)->save();
            $this->audit($request, 'MODIFICATION', 'affectation', $affectation->id, [
                'avant' => $before,
                'apres' => $this->assignmentAuditData($affectation),
            ]);
        });

        return response()->json(['data' => $this->assignmentData($affectation->fresh()->load(['user', 'role', 'unite']))]);
    }

    public function units(): JsonResponse
    {
        $units = Unite::query()->withCount(['affectations', 'equipements'])->orderBy('libelle')->get();

        return response()->json(['data' => $units]);
    }

    public function createUnit(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:255', 'unique:unites,code'],
            'libelle' => ['required', 'string', 'max:255'],
            'actif' => ['sometimes', 'boolean'],
        ]);

        $unit = DB::transaction(function () use ($request, $validated): Unite {
            $unit = Unite::create([...$validated, 'actif' => $validated['actif'] ?? true]);
            $this->audit($request, 'CREATION', 'unite', $unit->id, $unit->only(['code', 'libelle', 'actif']));

            return $unit;
        });

        return response()->json(['data' => $unit], 201);
    }

    public function updateUnit(Request $request, Unite $unite): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('unites', 'code')->ignore($unite->id)],
            'libelle' => ['sometimes', 'required', 'string', 'max:255'],
            'actif' => ['sometimes', 'boolean'],
        ]);
        $before = $unite->only(['code', 'libelle', 'actif']);

        DB::transaction(function () use ($request, $unite, $validated, $before): void {
            $unite->fill($validated)->save();
            $this->audit($request, 'MODIFICATION', 'unite', $unite->id, [
                'avant' => $before,
                'apres' => $unite->only(['code', 'libelle', 'actif']),
            ]);
        });

        return response()->json(['data' => $unite->fresh()->loadCount(['affectations', 'equipements'])]);
    }

    public function equipment(): JsonResponse
    {
        return response()->json([
            'data' => Equipement::query()->with('unite:id,code,libelle')->orderBy('libelle')->get(),
        ]);
    }

    public function createEquipment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:255', 'unique:equipements,code'],
            'libelle' => ['required', 'string', 'max:255'],
            'reference_sap' => ['sometimes', 'nullable', 'string', 'max:255'],
            'unite_id' => ['sometimes', 'nullable', 'integer', 'exists:unites,id'],
            'actif' => ['sometimes', 'boolean'],
        ]);
        $this->validateActiveUnit($validated['unite_id'] ?? null);

        $equipment = DB::transaction(function () use ($request, $validated): Equipement {
            $equipment = Equipement::create([...$validated, 'actif' => $validated['actif'] ?? true]);
            $this->audit($request, 'CREATION', 'equipement', $equipment->id, $equipment->only(['code', 'libelle', 'reference_sap', 'unite_id', 'actif']));

            return $equipment;
        });

        return response()->json(['data' => $equipment->load('unite:id,code,libelle')], 201);
    }

    public function updateEquipment(Request $request, Equipement $equipement): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('equipements', 'code')->ignore($equipement->id)],
            'libelle' => ['sometimes', 'required', 'string', 'max:255'],
            'reference_sap' => ['sometimes', 'nullable', 'string', 'max:255'],
            'unite_id' => ['sometimes', 'nullable', 'integer', 'exists:unites,id'],
            'actif' => ['sometimes', 'boolean'],
        ]);
        if (array_key_exists('unite_id', $validated)) {
            $this->validateActiveUnit($validated['unite_id']);
        }
        $before = $equipement->only(['code', 'libelle', 'reference_sap', 'unite_id', 'actif']);

        DB::transaction(function () use ($request, $equipement, $validated, $before): void {
            $equipement->fill($validated)->save();
            $this->audit($request, 'MODIFICATION', 'equipement', $equipement->id, [
                'avant' => $before,
                'apres' => $equipement->only(['code', 'libelle', 'reference_sap', 'unite_id', 'actif']),
            ]);
        });

        return response()->json(['data' => $equipement->fresh()->load('unite:id,code,libelle')]);
    }

    public function lists(): JsonResponse
    {
        $lists = Liste::query()
            ->with(['valeurs' => fn ($query) => $query->orderBy('ordre')->orderBy('id')])
            ->orderBy('libelle')
            ->get();

        return response()->json(['data' => $lists->map(fn (Liste $list) => $this->listData($list))]);
    }

    public function listValues(Liste $liste): JsonResponse
    {
        $liste->load(['valeurs' => fn ($query) => $query->orderBy('ordre')->orderBy('id')]);

        return response()->json(['data' => $liste->valeurs->map(fn (ValeurListe $value) => $this->valueData($value))]);
    }

    public function createListValue(Request $request, Liste $liste): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:255', Rule::unique('valeurs_listes', 'code')->where('liste_id', $liste->id)],
            'libelle' => ['required', 'string', 'max:255'],
            'ordre' => ['sometimes', 'integer', 'min:0'],
            'actif' => ['sometimes', 'boolean'],
        ]);
        $validated['ordre'] ??= ((int) $liste->valeurs()->max('ordre')) + 1;
        $validated['actif'] ??= true;

        $value = DB::transaction(function () use ($request, $liste, $validated): ValeurListe {
            $value = $liste->valeurs()->create($validated);
            $this->audit($request, 'CREATION', 'valeur_liste', $value->id, $this->valueAuditData($value));

            return $value;
        });

        return response()->json(['data' => $this->valueData($value)], 201);
    }

    public function reorderListValues(Request $request, Liste $liste): JsonResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['required', 'integer', 'distinct', 'exists:valeurs_listes,id'],
        ]);

        $orderedIds = array_map('intval', $validated['ids']);
        $listValueIds = $liste->valeurs()->orderBy('id')->pluck('id')->map(fn ($id) => (int) $id)->all();
        $providedIds = $orderedIds;
        sort($providedIds, SORT_NUMERIC);
        if ($providedIds !== $listValueIds) {
            throw ValidationException::withMessages([
                'ids' => ['L’ordre doit contenir une seule fois chaque valeur de cette liste.'],
            ]);
        }

        $values = DB::transaction(function () use ($request, $liste, $orderedIds): array {
            foreach ($orderedIds as $index => $id) {
                $value = $liste->valeurs()->findOrFail($id);
                $before = $this->valueAuditData($value);
                $value->update(['ordre' => $index + 1]);
                $this->audit($request, 'REORDONNANCEMENT', 'valeur_liste', $value->id, [
                    'avant' => $before,
                    'apres' => $this->valueAuditData($value),
                ]);
            }

            return $liste->valeurs()->orderBy('ordre')->orderBy('id')->get()
                ->map(fn (ValeurListe $value) => $this->valueData($value))
                ->all();
        });

        return response()->json(['data' => $values]);
    }

    public function updateListValue(Request $request, Liste $liste, ValeurListe $valeur): JsonResponse
    {
        abort_unless($valeur->liste_id === $liste->id, 404);

        $validated = $request->validate([
            'code' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('valeurs_listes', 'code')->where('liste_id', $liste->id)->ignore($valeur->id)],
            'libelle' => ['sometimes', 'required', 'string', 'max:255'],
            'ordre' => ['sometimes', 'integer', 'min:0'],
            'actif' => ['sometimes', 'boolean'],
        ]);
        $before = $this->valueAuditData($valeur);

        DB::transaction(function () use ($request, $valeur, $validated, $before): void {
            $valeur->fill($validated)->save();
            $this->audit($request, 'MODIFICATION', 'valeur_liste', $valeur->id, [
                'avant' => $before,
                'apres' => $this->valueAuditData($valeur),
            ]);
        });

        return response()->json(['data' => $this->valueData($valeur->fresh())]);
    }

    public function settings(): JsonResponse
    {
        $settings = self::SETTINGS_DEFAULTS;
        foreach (Parametre::query()->whereIn('cle', array_keys(self::SETTINGS_DEFAULTS))->get() as $parameter) {
            $settings[$parameter->cle] = $this->settingValue($parameter->cle, $parameter->valeur);
        }

        return response()->json(['data' => $settings]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reminder_interval_days' => ['required', 'integer', 'min:1'],
            'validation_reminders_enabled' => ['required', 'boolean'],
            'attachment_max_size_mb' => ['required', 'integer', 'min:1'],
            'attachment_max_files' => ['required', 'integer', 'min:1'],
        ]);

        DB::transaction(function () use ($request, $validated): void {
            foreach ($validated as $key => $value) {
                Parametre::query()->updateOrCreate(
                    ['cle' => $key],
                    ['valeur' => is_bool($value) ? ($value ? 'true' : 'false') : (string) $value],
                );
            }
            $this->audit($request, 'MODIFICATION', 'parametres', null, ['valeurs' => $validated]);
        });

        return response()->json(['data' => $this->settings()->getData(true)['data']]);
    }

    private function validateAssignmentScope(int $roleId, int|string|null $unitId, bool $requireActiveUnit = true): void
    {
        $role = Role::query()->findOrFail($roleId);
        $requiresUnit = in_array($role->code, self::SCOPED_ROLE_CODES, true);
        if ($requiresUnit !== ($unitId !== null)) {
            throw ValidationException::withMessages([
                'unite_id' => [$requiresUnit
                    ? 'Ce rôle nécessite une affectation à une unité.'
                    : 'Ce rôle est global et ne peut pas être rattaché à une unité.'],
            ]);
        }

        if ($requireActiveUnit) {
            $this->validateActiveUnit($unitId);
        }
    }

    private function validateAssignmentDates(?string $startDate, ?string $endDate): void
    {
        if ($startDate !== null && $endDate !== null && Carbon::parse($endDate)->lt(Carbon::parse($startDate))) {
            throw ValidationException::withMessages([
                'date_fin' => ['La date de fin doit être postérieure ou égale à la date de début.'],
            ]);
        }
    }

    private function assertUniqueAssignment(int $userId, int $roleId, int|string|null $unitId, ?int $exceptId = null): void
    {
        $duplicateExists = Affectation::query()
            ->where('user_id', $userId)
            ->where('role_id', $roleId)
            ->where(fn ($query) => $unitId === null
                ? $query->whereNull('unite_id')
                : $query->where('unite_id', $unitId))
            ->when($exceptId, fn ($query) => $query->where('id', '!=', $exceptId))
            ->exists();

        if ($duplicateExists) {
            throw ValidationException::withMessages([
                'role_id' => ['Cette affectation existe déjà pour cet utilisateur, ce rôle et cette unité.'],
            ]);
        }
    }

    private function validateActiveUnit(int|string|null $unitId): void
    {
        if ($unitId !== null && ! Unite::query()->whereKey($unitId)->where('actif', true)->exists()) {
            throw ValidationException::withMessages([
                'unite_id' => ['L’unité sélectionnée n’existe pas ou est inactive.'],
            ]);
        }
    }

    private function audit(Request $request, string $operation, string $object, ?int $id, array $detail): void
    {
        JournalAdministration::create([
            'auteur_id' => $request->user()->id,
            'operation' => $operation,
            'objet' => $object.($id === null ? '' : ':'.$id),
            'detail' => $detail,
            'created_at' => now(),
        ]);
    }

    private function userData(User $user): array
    {
        return [
            'id' => $user->id,
            'identifiant' => $user->identifiant,
            'nom' => $user->nom,
            'prenom' => $user->prenom,
            'email' => $user->email,
            'auth_source' => $user->auth_source,
            'ldap_dn' => $user->ldap_dn,
            'actif' => $user->actif,
            'derniere_connexion' => $user->derniere_connexion,
            'affectations' => $user->affectations->map(fn (Affectation $assignment) => $this->assignmentData($assignment))->values(),
        ];
    }

    private function ficheAdminData(FicheA3 $fiche): array
    {
        return [
            'id' => $fiche->id,
            'numero_a3' => $fiche->numero_a3,
            'titre' => $fiche->titre,
            'statut_etape' => $fiche->statut_etape,
            'statut_general' => $fiche->statut_general,
            'confidentialite' => $fiche->confidentialite,
            'unite' => $fiche->unite?->only(['id', 'code', 'libelle']),
            'pilote' => $fiche->pilote?->only(['id', 'identifiant', 'nom', 'prenom', 'actif']),
        ];
    }

    private function userAuditData(User $user): array
    {
        return $user->only(['identifiant', 'nom', 'prenom', 'email', 'auth_source', 'ldap_dn', 'actif']);
    }

    private function assignmentData(Affectation $assignment): array
    {
        return [
            'id' => $assignment->id,
            'user_id' => $assignment->user_id,
            'role_id' => $assignment->role_id,
            'unite_id' => $assignment->unite_id,
            'actif' => $assignment->actif,
            'date_debut' => $assignment->date_debut,
            'date_fin' => $assignment->date_fin,
            'user' => $assignment->relationLoaded('user') && $assignment->user ? $assignment->user->only(['id', 'identifiant', 'nom', 'prenom', 'email', 'actif']) : null,
            'role' => $assignment->relationLoaded('role') && $assignment->role ? $assignment->role->only(['id', 'code', 'libelle']) : null,
            'unite' => $assignment->relationLoaded('unite') && $assignment->unite ? $assignment->unite->only(['id', 'code', 'libelle']) : null,
        ];
    }

    private function assignmentAuditData(Affectation $assignment): array
    {
        return $assignment->only(['user_id', 'role_id', 'unite_id', 'actif', 'date_debut', 'date_fin']);
    }

    private function listData(Liste $list): array
    {
        return [
            'id' => $list->id,
            'code' => $list->code,
            'libelle' => $list->libelle,
            'description' => $list->description,
            'valeurs' => $list->valeurs->map(fn (ValeurListe $value) => $this->valueData($value))->values(),
        ];
    }

    private function valueData(ValeurListe $value): array
    {
        return $value->only(['id', 'liste_id', 'code', 'libelle', 'ordre', 'actif']);
    }

    private function valueAuditData(ValeurListe $value): array
    {
        return $this->valueData($value);
    }

    private function settingValue(string $key, ?string $value): int|bool
    {
        if ($key === 'validation_reminders_enabled') {
            return filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? self::SETTINGS_DEFAULTS[$key];
        }

        return is_numeric($value) ? (int) $value : self::SETTINGS_DEFAULTS[$key];
    }
}
