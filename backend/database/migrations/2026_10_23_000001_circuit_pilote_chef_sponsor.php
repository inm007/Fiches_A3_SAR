<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Circuit précisé le 23 octobre 2026 : le pilote remplit les sections 1 à 4 et choisit le
 * chef de département qui valide la pertinence (porte 0) ; le directeur sponsor valide
 * la clôture ; les gains se saisissent à la main ; les participants sans compte disparaissent.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fiches_a3', function (Blueprint $table) {
            $table->foreignId('chef_pertinence_id')->nullable()->constrained('users')->restrictOnDelete();
        });

        // Les fiches déjà soumises gardent leur chef : celui du département figé à la soumission.
        DB::statement('UPDATE fiches_a3 SET chef_pertinence_id = entites.responsable_id FROM entites WHERE entites.id = fiches_a3.departement_id');

        Schema::table('fiches_a3', function (Blueprint $table) {
            $table->dropConstrainedForeignId('departement_id');
            $table->dropColumn('equipe');
        });

        Schema::table('gains', function (Blueprint $table) {
            $table->decimal('quantite', 15, 4)->nullable()->change();
            $table->string('unite', 50)->nullable()->change();
            $table->unsignedBigInteger('cout_unitaire')->nullable()->change();
        });
    }

    public function down(): void
    {
        DB::table('gains')->whereNull('quantite')->update(['quantite' => 1]);
        DB::table('gains')->whereNull('unite')->update(['unite' => 'forfait']);
        DB::statement('UPDATE gains SET cout_unitaire = montant_annuel WHERE cout_unitaire IS NULL');
        Schema::table('gains', function (Blueprint $table) {
            $table->decimal('quantite', 15, 4)->nullable(false)->change();
            $table->string('unite', 50)->nullable(false)->change();
            $table->unsignedBigInteger('cout_unitaire')->nullable(false)->change();
        });

        Schema::table('fiches_a3', function (Blueprint $table) {
            $table->json('equipe')->nullable();
            $table->foreignId('departement_id')->nullable()->constrained('entites')->restrictOnDelete();
            $table->dropConstrainedForeignId('chef_pertinence_id');
        });
    }
};
