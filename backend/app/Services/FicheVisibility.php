<?php

namespace App\Services;

use App\Enums\Domaine;
use App\Enums\StatutEtape;
use App\Models\DomaineRole;
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

        if (in_array($role, ['DIRECTION', 'ADMIN_FONCTIONNEL'], true)) {
            return $query;
        }
        if (! in_array($role, ['AGENT', 'PILOTE', Organigramme::ROLE_CHEF, 'CONTROLE_GESTION', ...Domaine::rolesValideurs()], true)) {
            return $query->whereRaw('1 = 0');
        }

        // Les membres de l'équipe voient la fiche, quel que soit leur profil actif.
        return $query->where(fn (Builder $q) => $this->scope($q, $profile)
            ->orWhereHas('membres', fn (Builder $membre) => $membre->where('users.id', $userId)));
    }

    /**
     * @param  Builder<FicheA3>  $query
     * @return Builder<FicheA3>
     */
    private function scope(Builder $query, ActiveProfile $profile): Builder
    {
        $userId = $profile->userId();
        $role = $profile->roleCode();

        return match (true) {
            $role === 'AGENT' => $query->where(fn (Builder $q) => $this->agentScope($q, $userId)),
            $role === 'PILOTE' => $query->where(function (Builder $q) use ($userId, $profile): void {
                $q->pilotePar($userId)
                    ->orWhere(fn (Builder $normal) => $normal
                        ->where('confidentialite', 'NORMAL')
                        ->where(fn (Builder $agent) => $this->agentScope($agent, $userId)))
                    ->orWhere(fn (Builder $ownRestrictedDraft) => $ownRestrictedDraft
                        ->where('confidentialite', 'RESTREINT')
                        ->where('declarant_id', $userId)
                        ->whereNull('pilote_id')
                        ->where('statut_etape', StatutEtape::Ouvert->value))
                    // Pertinence validée, sans pilote : à prendre en charge par un pilote du périmètre.
                    ->orWhere(fn (Builder $aPrendre) => $aPrendre
                        ->whereNull('pilote_id')
                        ->whereNotNull('pertinence_validee_le')
                        ->where('statut_etape', StatutEtape::Ouvert->value)
                        ->when($profile->uniteId() !== null, fn (Builder $scoped) => $scoped->where('unite_id', $profile->uniteId())));
            }),
            // Chef de département : les fiches de son département et celles qu'on lui soumet.
            $role === Organigramme::ROLE_CHEF => $query->where(fn (Builder $q) => $q
                ->whereHas('departement', fn (Builder $departement) => $departement->where('responsable_id', $userId))
                ->orWhereHas('validations', fn (Builder $validation) => $validation->pourValideur($userId))),
            $role === 'CONTROLE_GESTION' => $query->where(function (Builder $q) use ($userId): void {
                $q->where(fn (Builder $normal) => $normal
                    ->where('confidentialite', 'NORMAL')
                    ->whereHas('gains'))
                    ->orWhereHas('gains', fn (Builder $gain) => $gain->where('statut', 'PROPOSE'))
                    ->orWhereHas('validations', fn (Builder $validation) => $validation->pourValideur($userId));
            }),
            default => $this->validatorScope($query, $profile),
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
     * Directeur : fiches Normal de son périmètre dont un domaine coché le sollicite
     * (correspondance de l'écran Circuit de validation), ou toute fiche où il est sollicité.
     * La Production / Exploitation voit toutes les fiches Normal de son unité.
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
        $domaines = DomaineRole::domainesDuRole((string) $profile->roleCode());

        return $query->where(function (Builder $q) use ($userId, $roleId, $uniteId, $isProduction, $domaines): void {
            $q->where(function (Builder $normal) use ($roleId, $uniteId, $isProduction, $domaines): void {
                $normal->where('confidentialite', 'NORMAL')
                    ->when($uniteId !== null, fn (Builder $scoped) => $scoped->where('unite_id', $uniteId))
                    ->when(! $isProduction, fn (Builder $domain) => $domain
                        ->whereHas('domaines', fn (Builder $d) => $d->where(fn (Builder $w) => $w->whereIn('domaine', $domaines)->orWhere('valideur_role_id', $roleId))));
            })->orWhereHas('validations', fn (Builder $validation) => $validation->pourValideur($userId));
        });
    }
}
