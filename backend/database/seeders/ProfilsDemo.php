<?php

namespace Database\Seeders;

use App\Models\Affectation;
use App\Models\User;
use App\Services\ActiveProfile;
use Illuminate\Http\Request;
use Illuminate\Session\ArraySessionHandler;
use Illuminate\Session\Store;

/**
 * Profils actifs simulés pour les seeders de démonstration : les comptes agissent par les
 * vrais services, avec le rôle et l'unité de l'affectation choisie.
 */
trait ProfilsDemo
{
    private function profil(string $identifiant, string $roleCode, ?int $uniteId): ActiveProfile
    {
        $user = User::where('identifiant', $identifiant)->firstOrFail();
        $affectation = Affectation::where('user_id', $user->id)
            ->whereHas('role', fn ($q) => $q->where('code', $roleCode))
            ->when($uniteId !== null, fn ($q) => $q->where('unite_id', $uniteId))
            ->firstOrFail();

        return $this->profilAffectation($affectation);
    }

    /**
     * Profil actif simulé : une requête avec l'utilisateur et l'affectation en session.
     */
    private function profilAffectation(Affectation $affectation): ActiveProfile
    {
        $user = $affectation->user()->firstOrFail();
        $request = Request::create('/');
        $request->setLaravelSession(new Store('demo', new ArraySessionHandler(30)));
        $request->session()->put('auth.active_assignment_id', $affectation->id);
        $request->setUserResolver(fn () => $user);

        return new ActiveProfile($request);
    }
}
