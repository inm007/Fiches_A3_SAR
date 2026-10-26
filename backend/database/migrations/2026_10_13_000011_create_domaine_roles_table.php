<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Correspondance domaine → directeurs qui valident le plan (écran Circuit de validation).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('domaine_roles', function (Blueprint $table) {
            $table->id();
            $table->string('domaine', 50);
            $table->foreignId('role_id')->constrained('roles')->restrictOnDelete();
            $table->timestampsTz();

            $table->unique(['domaine', 'role_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('domaine_roles');
    }
};
