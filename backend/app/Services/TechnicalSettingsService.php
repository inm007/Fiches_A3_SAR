<?php

namespace App\Services;

use App\Models\JournalAdministration;
use App\Models\Parametre;
use App\Models\User;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Crypt;

class TechnicalSettingsService
{
    /**
     * Paramètres SMTP modifiables par l'administrateur technique (TRD §9).
     * Les autres paramètres (fonctionnels) restent hors de sa portée.
     *
     * @var array<string, array<int, string>>
     */
    public const array SMTP_RULES = [
        'SMTP_HOST' => ['nullable', 'string', 'max:255'],
        'SMTP_PORT' => ['nullable', 'integer', 'between:1,65535'],
        'SMTP_ENCRYPTION' => ['nullable', 'string', 'in:tls,ssl'],
        'SMTP_USER' => ['nullable', 'string', 'max:255'],
        'SMTP_PASSWORD' => ['nullable', 'string', 'max:255'],
        'SMTP_FROM_ADDRESS' => ['nullable', 'email', 'max:255'],
    ];

    private const string SECRET_KEY = 'SMTP_PASSWORD';

    /**
     * @return array{auth_provider: string, sap_enabled: bool, mail_mailer: string, smtp: array<string, string|bool|null>}
     */
    public function overview(): array
    {
        $values = Parametre::query()
            ->whereIn('cle', array_keys(self::SMTP_RULES))
            ->pluck('valeur', 'cle');

        $smtp = [];
        foreach (array_keys(self::SMTP_RULES) as $key) {
            if ($key === self::SECRET_KEY) {
                $smtp['SMTP_PASSWORD_SET'] = $this->decryptSecret($values->get($key)) !== null;

                continue;
            }

            $smtp[$key] = $values->get($key);
        }

        return [
            'auth_provider' => (string) config('a3.auth_provider'),
            'sap_enabled' => (bool) config('a3.sap_enabled'),
            'mail_mailer' => (string) config('mail.default'),
            'smtp' => $smtp,
        ];
    }

    public function updateSetting(User $author, string $key, ?string $value): void
    {
        $storedValue = $key === self::SECRET_KEY && $value !== null && $value !== ''
            ? Crypt::encryptString($value)
            : ($value === '' ? null : $value);

        Parametre::query()->updateOrCreate(['cle' => $key], ['valeur' => $storedValue]);

        JournalAdministration::create([
            'auteur_id' => $author->id,
            'operation' => 'MODIFICATION_PARAMETRE_TECHNIQUE',
            'objet' => 'parametre:'.$key,
            'detail' => ['cle' => $key, 'valeur' => $key === self::SECRET_KEY ? '[masqué]' : $storedValue],
            'created_at' => now(),
        ]);
    }

    public function smtpPassword(): ?string
    {
        return $this->decryptSecret(Parametre::query()->where('cle', self::SECRET_KEY)->value('valeur'));
    }

    public function getTechnicalLogs(int $limit = 100): Collection
    {
        return JournalAdministration::query()
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get(['id', 'auteur_id', 'operation', 'objet', 'detail', 'created_at']);
    }

    private function decryptSecret(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        try {
            return Crypt::decryptString($value);
        } catch (DecryptException) {
            return null;
        }
    }
}
