<?php

// Commandes Artisan et tâches planifiées propres à l’application.

use App\Services\RelanceService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('a3:relances', function (RelanceService $relances): void {
    $this->info($relances->rappels().' relance(s) envoyée(s).');
})->purpose('Rappels automatiques des actions en retard et des validations en attente (PRD §9).');

Schedule::command('a3:relances')->dailyAt('07:00')->withoutOverlapping();
