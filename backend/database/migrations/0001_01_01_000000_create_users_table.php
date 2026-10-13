<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('identifiant')->unique();
            $table->string('nom');
            $table->string('prenom');
            $table->string('email')->unique();
            $table->timestampTz('email_verified_at')->nullable();
            $table->string('password')->nullable();
            $table->string('auth_source', 20)->default('local');
            $table->string('ldap_dn')->nullable()->unique();
            $table->boolean('actif')->default(true);
            $table->timestampTz('derniere_connexion')->nullable();
            $table->rememberToken();
            $table->timestampsTz();
        });

        DB::statement("ALTER TABLE users ADD CONSTRAINT users_auth_source_check CHECK (auth_source IN ('local', 'ldap'))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_source_check');
        Schema::dropIfExists('users');
    }
};
