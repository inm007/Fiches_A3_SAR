<?php

namespace App\Services;

use App\Models\Affectation;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * Profil actif de la requête : affectation choisie en session (PRD §2.2).
 * Les droits dépendent de ce profil, pas de l'ensemble des rôles de l'utilisateur.
 */
class ActiveProfile
{
    private ?Affectation $assignment = null;

    private bool $resolved = false;

    public function __construct(private readonly Request $request) {}

    public function user(): ?User
    {
        return $this->request->user();
    }

    public function assignment(): ?Affectation
    {
        if ($this->resolved) {
            return $this->assignment;
        }

        $this->resolved = true;
        $user = $this->user();
        $assignmentId = $this->request->hasSession()
            ? $this->request->session()->get('auth.active_assignment_id')
            : null;

        if (! $user || ! $user->actif || ! $assignmentId) {
            return null;
        }

        $this->assignment = Affectation::query()
            ->with('role:id,code,libelle')
            ->whereKey($assignmentId)
            ->where('user_id', $user->id)
            ->where('actif', true)
            ->where(fn ($query) => $query->whereNull('date_debut')->orWhere('date_debut', '<=', now()))
            ->where(fn ($query) => $query->whereNull('date_fin')->orWhere('date_fin', '>=', now()))
            ->first();

        return $this->assignment;
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

    public function userId(): ?int
    {
        return $this->user()?->id;
    }
}
