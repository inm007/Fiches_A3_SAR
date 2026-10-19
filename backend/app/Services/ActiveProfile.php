<?php

namespace App\Services;

use App\Enums\Domaine;
use App\Models\Affectation;
use App\Models\FicheA3;
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
     * Historique de la fiche (PRD §14) : pilote, Direction et administrateur fonctionnel.
     */
    public function peutVoirHistorique(): bool
    {
        return $this->is('PILOTE', 'DIRECTION', 'ADMIN_FONCTIONNEL');
    }

    /**
     * Commentaires (PRD §4.4) : tous les profils métier, pas les administrateurs.
     */
    public function peutCommenter(): bool
    {
        return $this->is('AGENT', 'PILOTE', 'CONTROLE_GESTION', 'DIRECTION', ...Domaine::rolesValideurs());
    }

    public function userId(): ?int
    {
        return $this->user()?->id;
    }
}
