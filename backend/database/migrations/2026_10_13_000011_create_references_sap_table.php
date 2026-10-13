<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('references_sap', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiche_id')->nullable()->constrained('fiches_a3')->restrictOnDelete();
            $table->foreignId('equipement_id')->nullable()->constrained('equipements')->restrictOnDelete();
            $table->string('numero_avis', 100)->nullable();
            $table->string('numero_ordre', 100)->nullable();
            $table->string('libelle')->nullable();
            $table->string('statut', 50)->nullable();
            $table->unsignedBigInteger('cout')->nullable();
            $table->timestampsTz();

            $table->index(['fiche_id', 'equipement_id']);
            $table->index(['numero_avis', 'numero_ordre']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('references_sap');
    }
};
