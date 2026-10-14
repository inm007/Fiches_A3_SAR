<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(RolesSeeder::class);
        $this->call(ReferenceListsSeeder::class);
        $this->call(TechnicalParametersSeeder::class);

        if (app()->environment(['local', 'testing'])) {
            $this->call(DemoAccountsSeeder::class);
        }

        // 15 fiches simulées à des étapes différentes : démonstration locale seulement (jamais en test ni en production).
        if (app()->environment('local')) {
            $this->call(DemoFichesSeeder::class);
        }
    }
}
