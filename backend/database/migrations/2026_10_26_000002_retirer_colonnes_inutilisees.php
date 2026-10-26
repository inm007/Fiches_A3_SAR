<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Nettoyage du 26 octobre 2026 : colonnes jamais écrites ou jamais relues, et listes de choix
 * sans usage. Les gains et l'impact financier estimé se saisissent à la main : la quantité,
 * l'unité et le coût unitaire des gains disparaissent. Ce qui sert aux futures connexions
 * LDAP, SMTP et SAP est conservé.
 */
return new class extends Migration
{
    private const array IMPACTS = ['HSE', 'PRODUCTION', 'QUALITE', 'ENERGIE', 'SURETE'];

    private const array LISTES = ['frequence_controle', 'domaine'];

    public function up(): void
    {
        Schema::table('gains', function (Blueprint $table) {
            $table->dropColumn(['quantite', 'unite', 'cout_unitaire']);
        });

        // L'impact financier est le champ « impact_financier_estime » de la fiche.
        DB::table('impacts')->where('type_impact', 'FINANCIER')->delete();
        $this->contrainteImpacts(self::IMPACTS);
        Schema::table('impacts', function (Blueprint $table) {
            $table->dropColumn('niveau');
        });

        Schema::table('fiches_a3', function (Blueprint $table) {
            $table->dropColumn('actif');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('email_verified_at');
        });

        // La méthode d'analyse est portée par la fiche (« methode_analyse »).
        Schema::table('causes', function (Blueprint $table) {
            $table->dropColumn('methode');
        });

        // Copie de la date de réalisation de l'action : seule l'échéance du jalon est relue.
        Schema::table('controles', function (Blueprint $table) {
            $table->dropColumn('date_reference');
        });

        $listes = DB::table('listes')->whereIn('code', self::LISTES)->pluck('id');
        DB::table('valeurs_listes')->whereIn('liste_id', $listes)->delete();
        DB::table('listes')->whereIn('id', $listes)->delete();
    }

    public function down(): void
    {
        Schema::table('controles', function (Blueprint $table) {
            $table->date('date_reference')->nullable();
        });
        DB::statement('UPDATE controles SET date_reference = actions.date_realisation FROM actions WHERE actions.id = controles.action_id');
        DB::statement('UPDATE controles SET date_reference = date_echeance WHERE date_reference IS NULL');

        Schema::table('causes', function (Blueprint $table) {
            $table->string('methode', 50)->default('NON_PRECISEE');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->timestampTz('email_verified_at')->nullable();
        });

        Schema::table('fiches_a3', function (Blueprint $table) {
            $table->boolean('actif')->default(true);
        });

        Schema::table('impacts', function (Blueprint $table) {
            $table->string('niveau')->nullable();
        });
        $this->contrainteImpacts([...self::IMPACTS, 'FINANCIER']);

        Schema::table('gains', function (Blueprint $table) {
            $table->decimal('quantite', 15, 4)->nullable();
            $table->string('unite', 50)->nullable();
            $table->unsignedBigInteger('cout_unitaire')->nullable();
        });
    }

    /**
     * @param  array<int, string>  $types
     */
    private function contrainteImpacts(array $types): void
    {
        DB::statement('ALTER TABLE impacts DROP CONSTRAINT IF EXISTS impacts_type_check');
        $liste = implode(', ', array_map(fn (string $type) => "'{$type}'", $types));
        DB::statement("ALTER TABLE impacts ADD CONSTRAINT impacts_type_check CHECK (type_impact IN ({$liste}))");
    }
};
