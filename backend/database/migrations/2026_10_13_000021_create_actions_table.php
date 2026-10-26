<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiche_id')->constrained('fiches_a3')->restrictOnDelete();
            $table->foreignId('cause_id')->constrained('causes')->restrictOnDelete();
            $table->foreignId('action_origine_id')->nullable()->constrained('actions')->restrictOnDelete();
            $table->text('description');
            $table->string('type_action', 50);
            $table->foreignId('responsable_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->date('echeance');
            $table->unsignedBigInteger('cout_estime')->default(0);
            $table->string('statut', 50)->default('A_FAIRE');
            $table->text('motif_statut')->nullable();
            $table->date('date_realisation')->nullable();
            $table->string('statut_avant_blocage', 50)->nullable();
            $table->text('critere_efficacite')->nullable();
            $table->text('preuve_realisation')->nullable();
            $table->foreignId('risque_id')->nullable()->constrained('risques')->restrictOnDelete();
            $table->timestampsTz();

            $table->index(['fiche_id', 'statut']);
            $table->index(['responsable_id', 'echeance']);
            $table->index('echeance');
        });

        DB::statement("ALTER TABLE actions ADD CONSTRAINT actions_statut_check CHECK (statut IN ('A_FAIRE', 'EN_COURS', 'REALISE', 'ANNULE', 'BLOQUE'))");
        DB::statement("ALTER TABLE actions ADD CONSTRAINT actions_statut_avant_blocage_check CHECK (statut_avant_blocage IS NULL OR statut_avant_blocage IN ('A_FAIRE', 'EN_COURS'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE actions DROP CONSTRAINT IF EXISTS actions_statut_check');
        Schema::dropIfExists('actions');
    }
};
