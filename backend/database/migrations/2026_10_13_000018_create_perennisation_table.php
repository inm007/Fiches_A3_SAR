<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('perennisation', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiche_id')->constrained('fiches_a3')->restrictOnDelete();
            $table->string('type', 50);
            $table->foreignId('responsable_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->date('date')->nullable();
            $table->string('statut', 50)->default('A_FAIRE');
            $table->string('preuve')->nullable();
            $table->timestampsTz();
        });

        DB::statement("ALTER TABLE perennisation ADD CONSTRAINT perennisation_type_check CHECK (type IN ('SOP', 'PARAMETRES', 'FORMATION', 'PLAN_MAINTENANCE', 'KPI_TABLEAU_DE_BORD'))");
        DB::statement("ALTER TABLE perennisation ADD CONSTRAINT perennisation_statut_check CHECK (statut IN ('A_FAIRE', 'EN_COURS', 'REALISE'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('perennisation');
    }
};
