<?php

namespace Database\Seeders;

use App\Models\Parametre;
use App\Services\TechnicalSettingsService;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Crypt;

class TechnicalParametersSeeder extends Seeder
{
    /**
     * Crée les clés SMTP vides sans écraser une configuration existante.
     * Le fournisseur d'authentification et SAP viennent de config/a3.php.
     */
    public function run(): void
    {
        foreach (array_keys(TechnicalSettingsService::SMTP_RULES) as $key) {
            Parametre::query()->firstOrCreate(['cle' => $key], ['valeur' => null]);
        }

        $this->clearPlainTextPassword();
    }

    /**
     * Un mot de passe SMTP enregistré en clair (ancien seeder) est effacé.
     */
    private function clearPlainTextPassword(): void
    {
        $password = Parametre::query()->where('cle', 'SMTP_PASSWORD')->first();

        if ($password === null || $password->valeur === null) {
            return;
        }

        try {
            Crypt::decryptString($password->valeur);
        } catch (DecryptException) {
            $password->update(['valeur' => null]);
        }
    }
}
