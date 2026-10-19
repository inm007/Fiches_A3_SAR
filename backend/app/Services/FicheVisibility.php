<?php

namespace App\Services;

use App\Enums\Domaine;
use App\Models\FicheA3;
use Illuminate\Database\Eloquent\Builder;

/**
 * Portée unique de visibilité des fiches (PRD §2.4). Elle s'applique aux listes,
 * au détail et à toutes les ressources d'une fiche : une fiche hors portée répond 404.
 */
class FicheVisibility
{
    /**
     * @param  Builder<FicheA3>  $query
     * @return Builder<FicheA3>
     */
    public function apply(Builder $query, ActiveProfile $profile): Builder
    {
        $userId = $profile->userId();
        $role = $profile->roleCode();

        if ($userId === null || $role === null) {
            return $query->whereRaw('1 = 0');
        }

        return match (true) {
            $role === 'DIRECTION', $role === 'ADMIN_FONCTIONNEL' => $query,
            $role === 'AGENT' => $query->where(fn (Builder $q) => $this->agentScope($q, $userId)),
            $role === 'PILOTE' => $query->where(function (Builder $q) use ($userId): void {
                $q->pilotePar($userId)
                    ->orWhere(fn (Builder $normal) => $normal
                        ->where('confidentialite', 'NORMAL')
                        ->where(fn (Builder $agent) => $this->agentScope($agent, $userId)));
            }),
            in_array($role, Domaine::rolesValideurs(), true) => $this->validatorScope($query, $profile),
            $role === 'CONTROLE_GESTION' => $query->where(function (Builder $q) use ($userId): void {
                $q->where(fn (Builder $normal) => $normal
                    ->where('confidentialite', 'NORMAL')
                    ->whereHas('gains'))
                    ->orWhereHas('gains', fn (Builder $gain) => $gain->where('statut', 'PROPOSE'))
                    ->orWhereHas('validations', fn (Builder $validation) => $validation->pourValideur($userId));
            }),
            default => $query->whereRaw('1 = 0'),
        };
    }

    public function canView(FicheA3 $fiche, ActiveProfile $profile): bool
    {
        return $this->apply(FicheA3::query()->whereKey($fiche->id), $profile)->exists();
    }

    /**
     * @param  Builder<FicheA3>  $query
     */
    private function agentScope(Builder $query, int $userId): void
    {
        $query->where('declarant_id', $userId)
            ->orWhereHas('actions', fn (Builder $action) => $action->where('responsable_id', $userId));
    }

    /**
     * Valideur : fiches Normal de son périmètre dont son domaine est concerné
     * (Production / Exploitation est toujours sollicitée), ou toute fiche où il est sollicité.
     *
     * @param  Builder<FicheA3>  $query
     * @return Builder<FicheA3>
     */
    private function validatorScope(Builder $query, ActiveProfile $profile): Builder
    {
        $userId = $profile->userId();
        $roleId = $profile->roleId();
        $uniteId = $profile->uniteId();
        $isProduction = $profile->roleCode() === 'VALIDEUR_PRODUCTION';

        return $query->where(function (Builder $q) use ($userId, $roleId, $uniteId, $isProduction): void {
            $q->where(function (Builder $normal) use ($roleId, $uniteId, $isProduction): void {
                $normal->where('confidentialite', 'NORMAL')
                    ->when($uniteId !== null, fn (Builder $scoped) => $scoped->where('unite_id', $uniteId))
                    ->when(! $isProduction, fn (Builder $domain) => $domain
                        ->whereHas('domaines', fn (Builder $d) => $d->where('valideur_role_id', $roleId)));
            })->orWhereHas('validations', fn (Builder $validation) => $validation->pourValideur($userId));
        });
    }
}
