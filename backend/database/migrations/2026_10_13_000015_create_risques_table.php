<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('risques', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiche_id')->constrained('fiches_a3')->restrictOnDelete();
            $table->string('domaine', 50);
            $table->text('description');
            $table->boolean('moc_requis')->default(false);
            $table->string('moc_reference')->nullable();
            $table->string('moc_statut', 50)->nullable();
            $table->string('moc_preuve')->nullable();
            $table->text('mesure_maitrise')->nullable();
            $table->foreignId('responsable_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestampsTz();

            $table->index(['fiche_id', 'domaine']);
        });

    }

    public function down(): void
    {
        Schema::dropIfExists('risques');
    }
};
