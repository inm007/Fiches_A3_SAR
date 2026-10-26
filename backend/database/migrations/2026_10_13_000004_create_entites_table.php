<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Organigramme (direction, département, service) : propose au pilote le chef de son
 * département et attribue le rôle Chef de département au responsable.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entites', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('libelle');
            $table->string('type', 20);
            $table->foreignId('parent_id')->nullable()->constrained('entites')->restrictOnDelete();
            $table->foreignId('responsable_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->boolean('actif')->default(true);
            $table->timestampsTz();

            $table->index('parent_id');
            $table->index('responsable_id');
        });

        DB::statement("ALTER TABLE entites ADD CONSTRAINT entites_type_check CHECK (type IN ('DIRECTION', 'DEPARTEMENT', 'SERVICE'))");

        // users et entites se référencent l'une l'autre : le rattachement est posé ici.
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('entite_id')->nullable()->constrained('entites')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('entite_id');
        });
        Schema::dropIfExists('entites');
    }
};
