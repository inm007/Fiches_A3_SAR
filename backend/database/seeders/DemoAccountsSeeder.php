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
 * Comptes de démonstration : deux utilisateurs par rôle, trois unités (PRD §1.1).
 * Le premier compte d'un rôle d'unité est affecté à l'unité DIST, le second à REF et UTIL.
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
     * Rôle => [identifiant, prénom, nom, portée] × 2. Portée : 'unit' ou 'global'.
     *
     * @var array<string, array<int, array{0: string, 1: string, 2: string}>>
     */
    private const array ACCOUNTS = [
        'AGENT' => [['agent.demo', 'Amadou', 'Ndiaye'], ['agent2.demo', 'Seynabou', 'Diallo']],
        'PILOTE' => [['pilote.demo', 'Fatou', 'Sarr'], ['pilote2.demo', 'Ibrahima', 'Fall']],
        'VALIDEUR_PRODUCTION' => [['valideur.demo', 'Moussa', 'Gaye'], ['valideur2.demo', 'Aïssatou', 'Ba']],
        'VALIDEUR_HSE' => [['valideur-hse.demo', 'Khady', 'Mbaye'], ['valideur-hse2.demo', 'Ousmane', 'Sow']],
        'VALIDEUR_PROCEDE' => [['valideur-procede.demo', 'Cheikh', 'Diop'], ['valideur-procede2.demo', 'Mariama', 'Kane']],
        'VALIDEUR_MAINTENANCE' => [['valideur-maintenance.demo', 'Aliou', 'Cissé'], ['valideur-maintenance2.demo', 'Rokhaya', 'Faye']],
        'VALIDEUR_INSPECTION' => [['valideur-inspection.demo', 'Ndeye', 'Thiam'], ['valideur-inspection2.demo', 'Pape', 'Seck']],
        'VALIDEUR_DSI' => [['valideur-dsi.demo', 'Adama', 'Faye'], ['valideur-dsi2.demo', 'Bineta', 'Sall']],
        'CONTROLE_GESTION' => [['controle.demo', 'Awa', 'Ndour'], ['controle2.demo', 'Babacar', 'Mbengue']],
        'DIRECTION' => [['direction.demo', 'Ibrahima', 'Sy'], ['direction2.demo', 'Coumba', 'Gueye']],
        'ADMIN_FONCTIONNEL' => [['admin-fonctionnel.demo', 'Mariama', 'Diouf'], ['admin-fonctionnel2.demo', 'Lamine', 'Camara']],
        'ADMIN_TECHNIQUE' => [['admin-technique.demo', 'Ousmane', 'Badji'], ['admin-technique2.demo', 'Astou', 'Niang']],
    ];

    private const array GLOBAL_ROLES = ['CONTROLE_GESTION', 'DIRECTION', 'ADMIN_FONCTIONNEL', 'ADMIN_TECHNIQUE'];

    /**
     * @var array<string, array<int, array{0: string, 1: string}>>
     */
    private const array EQUIPEMENTS = [
        'DIST' => [['P-201', 'Pompe de charge brut'], ['F-101', 'Four de distillation'], ['E-104', 'Rebouilleur colonne C-101'], ['V-310', 'Ballon de reflux']],
        'REF' => [['K-301', 'Compresseur de recyclage H2'], ['R-401', 'Réacteur de reformage'], ['E-420', 'Échangeur du train de préchauffe']],
        'UTIL' => [['T-02', 'Turbine à vapeur'], ['P-650', 'Pompe d’eau de refroidissement'], ['L-12', 'Ligne vapeur moyenne pression']],
    ];

    /**
     * Organigramme de démonstration : code => [libellé, type, parent, responsable].
     *
     * @var array<string, array{0: string, 1: string, 2: string|null, 3: string|null}>
     */
    private const array ORGANIGRAMME = [
        'DIR-PROD' => ['Direction de la Production', 'DIRECTION', null, null],
        'DEP-EXP' => ['Département Exploitation', 'DEPARTEMENT', 'DIR-PROD', 'chef.demo'],
        'SRV-DIST' => ['Service Distillation', 'SERVICE', 'DEP-EXP', null],
        'SRV-REF' => ['Service Reformage', 'SERVICE', 'DEP-EXP', null],
        'SRV-UTIL' => ['Service Utilités', 'SERVICE', 'DEP-EXP', null],
        'DIR-TECH' => ['Direction Technique', 'DIRECTION', null, null],
        'DEP-MAINT' => ['Département Maintenance', 'DEPARTEMENT', 'DIR-TECH', 'chef2.demo'],
        'SRV-MECA' => ['Service Mécanique', 'SERVICE', 'DEP-MAINT', null],
    ];

    /**
     * Chefs de département (le profil leur est donné par l'organigramme) et rattachements.
     *
     * @var array<string, array{0: string, 1: string, 2: string}>
     */
    private const array CHEFS = [
        'chef.demo' => ['Mamadou', 'Diagne', 'DEP-EXP'],
        'chef2.demo' => ['Aminata', 'Touré', 'DEP-MAINT'],
    ];

    private const array RATTACHEMENTS = [
        'agent.demo' => 'SRV-DIST',
        'agent2.demo' => 'SRV-REF',
        'pilote.demo' => 'SRV-DIST',
        'pilote2.demo' => 'SRV-MECA',
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
                    ['libelle' => $libelle, 'reference_sap' => '10'.str_pad((string) crc32($equipementCode) % 100000, 5, '0', STR_PAD_LEFT), 'actif' => true],
                );
            }
        }

        foreach (self::ACCOUNTS as $roleCode => $accounts) {
            $role = Role::where('code', $roleCode)->firstOrFail();

            foreach ($accounts as $index => [$identifiant, $prenom, $nom]) {
                $user = User::updateOrCreate(
                    ['identifiant' => $identifiant],
                    [
                        'prenom' => $prenom,
                        'nom' => $nom,
                        'email' => $identifiant.'@example.test',
                        'password' => Hash::make(self::DEMO_PASSWORD),
                        'auth_source' => 'local',
                        'actif' => true,
                    ],
                );

                $perimetres = in_array($roleCode, self::GLOBAL_ROLES, true)
                    ? [null]
                    : ($index === 0 ? [$unites['DIST']->id] : [$unites['REF']->id, $unites['UTIL']->id]);

                foreach ($perimetres as $uniteId) {
                    Affectation::updateOrCreate(
                        ['user_id' => $user->id, 'role_id' => $role->id, 'unite_id' => $uniteId],
                        ['actif' => true],
                    );
                }
            }
        }

        $this->organigramme();
    }

    private function organigramme(): void
    {
        foreach (self::CHEFS as $identifiant => [$prenom, $nom]) {
            User::updateOrCreate(['identifiant' => $identifiant], [
                'prenom' => $prenom,
                'nom' => $nom,
                'email' => $identifiant.'@example.test',
                'password' => Hash::make(self::DEMO_PASSWORD),
                'auth_source' => 'local',
                'actif' => true,
            ]);
        }

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

        foreach ([...self::RATTACHEMENTS, ...array_map(fn (array $chef) => $chef[2], self::CHEFS)] as $identifiant => $code) {
            User::where('identifiant', $identifiant)->update(['entite_id' => $entites[$code]->id]);
        }

        app(Organigramme::class)->synchroniserChefs();
    }
}
