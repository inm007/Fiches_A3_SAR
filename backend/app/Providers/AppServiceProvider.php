<?php

namespace App\Providers;

use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
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
