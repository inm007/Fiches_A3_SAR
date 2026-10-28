<?php

namespace App\Providers;

use App\Services\Annuaire\Annuaire;
use App\Services\Annuaire\DemoAnnuaire;
use App\Services\Annuaire\LdapAnnuaire;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(Annuaire::class, fn () => config('a3.annuaire') === 'ldap' ? new LdapAnnuaire : new DemoAnnuaire);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Derrière un reverse proxy, TRUSTED_PROXIES liste ses adresses (ou « * ») : la limite
        // de connexion par adresse voit alors l'IP du poste et non celle du proxy.
        $proxies = config('app.trusted_proxies');
        if ($proxies) {
            TrustProxies::at($proxies === '*' ? '*' : array_map('trim', explode(',', $proxies)));
        }
    }
}
