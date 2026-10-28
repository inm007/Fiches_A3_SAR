<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Options créées depuis une fiche : elles se rangent sous la valeur « Autre » de leur liste
     * (parent_id) et gardent la trace de leur auteur.
     */
    public function up(): void
    {
        Schema::table('valeurs_listes', function (Blueprint $table) {
            $table->foreignId('parent_id')->nullable()->after('liste_id')->constrained('valeurs_listes')->restrictOnDelete();
            $table->foreignId('cree_par_id')->nullable()->after('actif')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('valeurs_listes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cree_par_id');
            $table->dropConstrainedForeignId('parent_id');
        });
    }
};
