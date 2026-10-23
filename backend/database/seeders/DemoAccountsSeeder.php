<?php

namespace Database\Seeders;

use App\Models\Affectation;
use App\Models\Entite;
use App\Models\Equipement;
use App\Models\Role;
use App\Models\Unite;
use App\Models\User;
use App\Services\Organigramme;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

/**
 * Comptes de démonstration, décrits compte par compte : deux utilisateurs par rôle, chacun
 * rattaché à l'organigramme et affecté à ses unités (PRD §1.1). Les deux chefs de département
 * reçoivent leur profil de l'organigramme.
 */
class DemoAccountsSeeder extends Seeder
{
    public const string DEMO_PASSWORD = 'Azerty123';

    /**
     * @var array<string, array{0: string, 1: string}>
     */
    public const array UNITES = [
        'DIST' => ['Distillation atmosphérique', 'Unité de distillation atmosphérique et sous vide'],
        'REF' => ['Reformage catalytique', 'Reformage et hydrotraitement'],
        'UTIL' => ['Utilités', 'Vapeur, eau de refroidissement, air comprimé'],
    ];

    /**
     * Compte => [prénom, nom, rôle, unités (vide : périmètre global), entité de rattachement].
     * Rôle null : chef de département, profil donné par l'organigramme.
     *
     * @var array<string, array{0: string, 1: string, 2: string|null, 3: array<int, string>, 4: string}>
     */
    public const array COMPTES = [
        'agent.demo' => ['Amadou', 'Ndiaye', 'AGENT', ['DIST'], 'SRV-DIST'],
        'agent2.demo' => ['Seynabou', 'Diallo', 'AGENT', ['REF', 'UTIL'], 'SRV-REF'],
        'pilote.demo' => ['Fatou', 'Sarr', 'PILOTE', ['DIST', 'REF'], 'SRV-DIST'],
        'pilote2.demo' => ['Ibrahima', 'Fall', 'PILOTE', ['REF', 'UTIL'], 'SRV-MECA'],
        'chef.demo' => ['Mamadou', 'Diagne', null, [], 'DEP-EXP'],
        'chef2.demo' => ['Aminata', 'Touré', null, [], 'DEP-MAINT'],
        'valideur.demo' => ['Moussa', 'Gaye', 'VALIDEUR_PRODUCTION', ['DIST'], 'DIR-PROD'],
        'valideur2.demo' => ['Aïssatou', 'Ba', 'VALIDEUR_PRODUCTION', ['REF', 'UTIL'], 'DIR-PROD'],
        'valideur-hse.demo' => ['Khady', 'Mbaye', 'VALIDEUR_HSE', ['DIST'], 'SRV-HSE'],
        'valideur-hse2.demo' => ['Ousmane', 'Sow', 'VALIDEUR_HSE', ['REF', 'UTIL'], 'SRV-HSE'],
        'valideur-procede.demo' => ['Cheikh', 'Diop', 'VALIDEUR_PROCEDE', ['DIST'], 'SRV-PROCEDE'],
        'valideur-procede2.demo' => ['Mariama', 'Kane', 'VALIDEUR_PROCEDE', ['REF', 'UTIL'], 'SRV-PROCEDE'],
        'valideur-maintenance.demo' => ['Aliou', 'Cissé', 'VALIDEUR_MAINTENANCE', ['DIST'], 'DIR-TECH'],
        'valideur-maintenance2.demo' => ['Rokhaya', 'Faye', 'VALIDEUR_MAINTENANCE', ['REF', 'UTIL'], 'DIR-TECH'],
        'valideur-inspection.demo' => ['Ndeye', 'Thiam', 'VALIDEUR_INSPECTION', ['DIST'], 'SRV-INSP'],
        'valideur-inspection2.demo' => ['Pape', 'Seck', 'VALIDEUR_INSPECTION', ['REF', 'UTIL'], 'SRV-INSP'],
        'valideur-dsi.demo' => ['Adama', 'Faye', 'VALIDEUR_DSI', ['DIST'], 'SRV-SI'],
        'valideur-dsi2.demo' => ['Bineta', 'Sall', 'VALIDEUR_DSI', ['REF', 'UTIL'], 'SRV-SI'],
        'controle.demo' => ['Awa', 'Ndour', 'CONTROLE_GESTION', [], 'SRV-CG'],
        'controle2.demo' => ['Babacar', 'Mbengue', 'CONTROLE_GESTION', [], 'SRV-CG'],
        'direction.demo' => ['Ibrahima', 'Sy', 'DIRECTION', [], 'DIR-PROD'],
        'direction2.demo' => ['Coumba', 'Gueye', 'DIRECTION', [], 'DIR-TECH'],
        'admin-fonctionnel.demo' => ['Mariama', 'Diouf', 'ADMIN_FONCTIONNEL', [], 'DIR-GEN'],
        'admin-fonctionnel2.demo' => ['Lamine', 'Camara', 'ADMIN_FONCTIONNEL', [], 'DIR-GEN'],
        'admin-technique.demo' => ['Ousmane', 'Badji', 'ADMIN_TECHNIQUE', [], 'SRV-SI'],
        'admin-technique2.demo' => ['Astou', 'Niang', 'ADMIN_TECHNIQUE', [], 'SRV-SI'],
    ];

    /**
     * Ancien compte désactivé, avec une affectation terminée : il reste visible dans l'administration.
     */
    private const array ANCIEN = ['ancien-agent.demo', 'Modou', 'Lo', 'AGENT', 'UTIL', 'SRV-UTIL'];

    /**
     * @var array<string, array<int, array{0: string, 1: string}>>
     */
    private const array EQUIPEMENTS = [
        'DIST' => [['P-201', 'Pompe de charge brut'], ['F-101', 'Four de distillation'], ['E-104', 'Rebouilleur colonne C-101'], ['V-310', 'Ballon de reflux'], ['C-101', 'Colonne de distillation'], ['D-120', 'Dessaleur']],
        'REF' => [['K-301', 'Compresseur de recyclage H2'], ['R-401', 'Réacteur de reformage'], ['E-420', 'Échangeur du train de préchauffe'], ['A-430', 'Aéroréfrigérant de tête']],
        'UTIL' => [['T-02', 'Turbine à vapeur'], ['P-650', 'Pompe d’eau de refroidissement'], ['L-12', 'Ligne vapeur moyenne pression'], ['B-07', 'Ballon d’air comprimé']],
    ];

    /**
     * Organigramme : code => [libellé, type, parent, responsable].
     *
     * @var array<string, array{0: string, 1: string, 2: string|null, 3: string|null}>
     */
    private const array ORGANIGRAMME = [
        'DIR-GEN' => ['Direction générale', 'DIRECTION', null, null],
        'SRV-CG' => ['Contrôle de gestion', 'SERVICE', 'DIR-GEN', null],
        'SRV-SI' => ['Systèmes d’information', 'SERVICE', 'DIR-GEN', null],
        'DIR-PROD' => ['Direction de la Production', 'DIRECTION', null, null],
        'DEP-EXP' => ['Département Exploitation', 'DEPARTEMENT', 'DIR-PROD', 'chef.demo'],
        'SRV-DIST' => ['Service Distillation', 'SERVICE', 'DEP-EXP', null],
        'SRV-REF' => ['Service Reformage', 'SERVICE', 'DEP-EXP', null],
        'SRV-UTIL' => ['Service Utilités', 'SERVICE', 'DEP-EXP', null],
        'SRV-PROCEDE' => ['Service Procédés', 'SERVICE', 'DIR-PROD', null],
        'DIR-TECH' => ['Direction Technique', 'DIRECTION', null, null],
        'DEP-MAINT' => ['Département Maintenance', 'DEPARTEMENT', 'DIR-TECH', 'chef2.demo'],
        'SRV-MECA' => ['Service Mécanique', 'SERVICE', 'DEP-MAINT', null],
        'SRV-INSP' => ['Service Inspection', 'SERVICE', 'DEP-MAINT', null],
        'SRV-HSE' => ['Service HSE', 'SERVICE', 'DIR-TECH', null],
    ];

    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new RuntimeException('Les comptes de démonstration ne peuvent être créés qu’en local ou en test.');
        }

        $unites = [];
        foreach (self::UNITES as $code => [$libelle]) {
            $unites[$code] = Unite::updateOrCreate(['code' => $code], ['libelle' => $libelle, 'actif' => true]);
        }

        foreach (self::EQUIPEMENTS as $code => $equipements) {
            foreach ($equipements as [$equipementCode, $libelle]) {
                Equipement::updateOrCreate(
                    ['unite_id' => $unites[$code]->id, 'code' => $equipementCode],
                    ['libelle' => $libelle, 'reference_sap' => '10'.str_pad((string) (crc32($equipementCode) % 100000), 5, '0', STR_PAD_LEFT), 'actif' => true],
                );
            }
        }

        foreach (self::COMPTES as $identifiant => [$prenom, $nom, $roleCode, $perimetre]) {
            $user = $this->compte($identifiant, $prenom, $nom, true);
            if ($roleCode === null) {
                continue;
            }

            $roleId = Role::where('code', $roleCode)->firstOrFail()->id;
            foreach ($perimetre === [] ? [null] : $perimetre as $uniteCode) {
                Affectation::updateOrCreate(
                    ['user_id' => $user->id, 'role_id' => $roleId, 'unite_id' => $uniteCode ? $unites[$uniteCode]->id : null],
                    ['actif' => true],
                );
            }
        }

        [$identifiant, $prenom, $nom, $roleCode, $uniteCode] = self::ANCIEN;
        $ancien = $this->compte($identifiant, $prenom, $nom, false);
        Affectation::updateOrCreate(
            ['user_id' => $ancien->id, 'role_id' => Role::where('code', $roleCode)->value('id'), 'unite_id' => $unites[$uniteCode]->id],
            ['actif' => false, 'date_debut' => now()->subYears(3), 'date_fin' => now()->subMonths(4)],
        );

        $this->organigramme();
    }

    private function compte(string $identifiant, string $prenom, string $nom, bool $actif): User
    {
        return User::updateOrCreate(['identifiant' => $identifiant], [
            'prenom' => $prenom,
            'nom' => $nom,
            'email' => $identifiant.'@example.test',
            'password' => Hash::make(self::DEMO_PASSWORD),
            'auth_source' => 'local',
            'actif' => $actif,
        ]);
    }

    private function organigramme(): void
    {
        $entites = [];
        foreach (self::ORGANIGRAMME as $code => [$libelle, $type, $parent, $responsable]) {
            $entites[$code] = Entite::updateOrCreate(['code' => $code], [
                'libelle' => $libelle,
                'type' => $type,
                'parent_id' => $parent ? $entites[$parent]->id : null,
                'responsable_id' => $responsable ? User::where('identifiant', $responsable)->value('id') : null,
                'actif' => true,
            ]);
        }

        $rattachements = array_map(fn (array $compte) => $compte[4], self::COMPTES) + [self::ANCIEN[0] => self::ANCIEN[5]];
        foreach ($rattachements as $identifiant => $code) {
            User::where('identifiant', $identifiant)->update(['entite_id' => $entites[$code]->id]);
        }

        app(Organigramme::class)->synchroniserChefs();
    }
}
