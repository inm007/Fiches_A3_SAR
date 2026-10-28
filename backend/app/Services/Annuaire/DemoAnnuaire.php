<?php

namespace App\Services\Annuaire;

use Illuminate\Support\Str;

/**
 * Annuaire de démonstration : quelques personnes fictives, pour parcourir la création
 * d'un compte annuaire tant que le serveur LDAP de la SAR n'est pas branché.
 */
class DemoAnnuaire implements Annuaire
{
    /**
     * @var array<int, array{0: string, 1: string, 2: string, 3: string}> identifiant, prénom, nom, fonction
     */
    private const array PERSONNES = [
        ['modou.ndao', 'Modou', 'Ndao', 'Opérateur distillation'],
        ['yacine.wade', 'Yacine', 'Wade', 'Ingénieure procédé'],
        ['serigne.lo', 'Serigne', 'Lô', 'Technicien maintenance'],
        ['mareme.dieng', 'Marème', 'Dieng', 'Responsable HSE'],
        ['alassane.kebe', 'Alassane', 'Kébé', 'Chef de quart'],
        ['dieynaba.tall', 'Dieynaba', 'Tall', 'Contrôleuse de gestion'],
        ['omar.samb', 'Omar', 'Samb', 'Inspecteur équipements'],
        ['sokhna.mbow', 'Sokhna', 'Mbow', 'Analyste laboratoire'],
        ['malick.thiaw', 'Malick', 'Thiaw', 'Chef de service expédition'],
        ['ramatoulaye.sene', 'Ramatoulaye', 'Sène', 'Ingénieure fiabilité'],
        ['babou.diatta', 'Babou', 'Diatta', 'Technicien instrumentation'],
        ['khoudia.ly', 'Khoudia', 'Ly', 'Assistante de direction'],
    ];

    public function rechercher(string $terme, int $limite = 20): array
    {
        $terme = Str::lower(Str::ascii(trim($terme)));

        return collect(self::PERSONNES)
            ->map(fn (array $personne) => [
                'ldap_dn' => "uid={$personne[0]},ou=personnel,dc=sar,dc=sn",
                'identifiant' => $personne[0],
                'nom' => $personne[2],
                'prenom' => $personne[1],
                'email' => "{$personne[0]}@sar.sn",
                'fonction' => $personne[3],
            ])
            ->filter(fn (array $personne) => $terme === ''
                || str_contains(Str::lower(Str::ascii(implode(' ', [$personne['identifiant'], $personne['prenom'], $personne['nom'], $personne['email']]))), $terme))
            ->take($limite)
            ->values()
            ->all();
    }

    public function source(): string
    {
        return 'demo';
    }
}
