<?php

namespace App\Services;

use App\Enums\Permission;
use App\Enums\StatutEtape;
use App\Models\Affectation;
use App\Models\FicheA3;
use App\Models\RolePermission;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * Profil actif de la requête : affectation choisie en session (PRD §2.2).
 * Les droits dépendent de ce profil, pas de l'ensemble des rôles de l'utilisateur.
 */
class ActiveProfile
{
    /**
     * L'affectation est lue une fois par requête, même si plusieurs instances sont créées
     * (injection dans le contrôleur, middleware, FicheResource).
     */
    private const string CACHE = 'a3.affectation_active';

    private const string CACHE_PERMISSIONS = 'a3.permissions_actives';

    public function __construct(private readonly Request $request) {}

    public function user(): ?User
    {
        return $this->request->user();
    }

    public function assignment(): ?Affectation
    {
        if ($this->request->attributes->has(self::CACHE)) {
            return $this->request->attributes->get(self::CACHE);
        }

        $user = $this->user();
        $assignmentId = $this->request->hasSession()
            ? $this->request->session()->get('auth.active_assignment_id')
            : null;

        $assignment = ! $user || ! $user->actif || ! $assignmentId ? null : Affectation::query()
            ->with('role:id,code,libelle')
            ->whereKey($assignmentId)
            ->where('user_id', $user->id)
            ->enCours()
            ->first();
        $this->request->attributes->set(self::CACHE, $assignment);

        return $assignment;
    }

    public function roleCode(): ?string
    {
        return $this->assignment()?->role?->code;
    }

    public function roleId(): ?int
    {
        return $this->assignment()?->role_id;
    }

    /**
     * Unité de l'affectation active ; null pour une affectation globale.
     */
    public function uniteId(): ?int
    {
        return $this->assignment()?->unite_id;
    }

    public function is(string ...$roleCodes): bool
    {
        return in_array($this->roleCode(), $roleCodes, true);
    }

    /**
     * Le profil actif est-il le pilote désigné de la fiche ?
     */
    public function estPiloteDe(FicheA3 $fiche): bool
    {
        return $this->is('PILOTE') && $fiche->estPilote($this->userId());
    }

    /**
     * Le pilote qui a déclaré une fiche de son unité peut s'en désigner pilote tant
     * qu'elle est ouverte et que personne ne la pilote.
     */
    public function peutSeDesignerPilote(FicheA3 $fiche): bool
    {
        return $this->is('PILOTE')
            && $fiche->declarant_id === $this->userId()
            && $fiche->unite_id === $this->uniteId()
            && $fiche->pilote_id === null
            && $fiche->etape() === StatutEtape::Ouvert;
    }

    /**
     * Droit accordé au rôle du profil actif par l'administrateur fonctionnel (écran Droits).
     */
    public function peut(Permission $permission): bool
    {
        return in_array($permission->value, $this->permissions(), true);
    }

    /**
     * Droits du rôle actif, lus une fois par requête.
     *
     * @return list<string>
     */
    public function permissions(): array
    {
        if ($this->request->attributes->has(self::CACHE_PERMISSIONS)) {
            return $this->request->attributes->get(self::CACHE_PERMISSIONS);
        }

        $permissions = RolePermission::pourRole($this->assignment()?->role);
        $this->request->attributes->set(self::CACHE_PERMISSIONS, $permissions);

        return $permissions;
    }

    public function peutVoirHistorique(): bool
    {
        return $this->peut(Permission::VoirHistorique);
    }

    public function peutCommenter(): bool
    {
        return $this->peut(Permission::Commenter);
    }

    public function userId(): ?int
    {
        return $this->user()?->id;
    }
}
