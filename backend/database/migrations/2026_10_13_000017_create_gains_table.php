<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gains', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiche_id')->constrained('fiches_a3')->restrictOnDelete();
            $table->string('categorie', 50);
            $table->text('hypothese_calcul');
            $table->decimal('quantite', 15, 4);
            $table->string('unite', 50);
            $table->unsignedBigInteger('cout_unitaire');
            $table->unsignedBigInteger('montant_annuel');
            $table->string('statut', 20)->default('PROPOSE');
            $table->foreignId('valide_par_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestampTz('date_validation')->nullable();
            $table->timestampsTz();

            $table->index(['fiche_id', 'statut']);
        });

        DB::statement("ALTER TABLE gains ADD CONSTRAINT gains_statut_check CHECK (statut IN ('PROPOSE', 'VALIDE', 'REFUSE'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE gains DROP CONSTRAINT IF EXISTS gains_statut_check');
        Schema::dropIfExists('gains');
    }
};
