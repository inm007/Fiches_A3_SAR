<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('validations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiche_id')->constrained('fiches_a3')->restrictOnDelete();
            $table->unsignedTinyInteger('porte');
            $table->foreignId('role_id')->constrained('roles')->restrictOnDelete();
            $table->foreignId('valideur_id')->constrained('users')->restrictOnDelete();
            $table->string('decision', 20)->default('EN_ATTENTE');
            $table->text('commentaire')->nullable();
            $table->unsignedInteger('version_fiche');
            $table->jsonb('empreinte_domaine')->nullable();
            $table->timestampTz('demandee_le')->useCurrent();
            $table->timestampTz('decidee_le')->nullable();
            $table->unsignedInteger('ordre')->default(0);
            $table->timestampsTz();

            $table->index(['fiche_id', 'porte', 'ordre']);
            $table->index(['valideur_id', 'decision']);
        });

        DB::statement("ALTER TABLE validations ADD CONSTRAINT validations_porte_check CHECK (porte IN (1, 2))");
        DB::statement("ALTER TABLE validations ADD CONSTRAINT validations_decision_check CHECK (decision IN ('EN_ATTENTE', 'VALIDE', 'REFUSE'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE validations DROP CONSTRAINT IF EXISTS validations_porte_check');
        DB::statement('ALTER TABLE validations DROP CONSTRAINT IF EXISTS validations_decision_check');
        Schema::dropIfExists('validations');
    }
};
