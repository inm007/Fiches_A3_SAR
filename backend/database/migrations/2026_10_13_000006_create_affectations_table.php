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
        Schema::create('affectations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('role_id')->constrained('roles')->restrictOnDelete();
            $table->foreignId('unite_id')->nullable()->constrained('unites')->restrictOnDelete();
            $table->boolean('actif')->default(true);
            $table->dateTimeTz('date_debut')->nullable();
            $table->dateTimeTz('date_fin')->nullable();
            $table->timestampsTz();

            $table->index(['user_id', 'actif']);
            $table->index(['unite_id', 'role_id']);
        });

        DB::statement('CREATE UNIQUE INDEX affectations_user_role_unite_unique ON affectations (user_id, role_id, COALESCE(unite_id, 0))');
        DB::statement('ALTER TABLE affectations ADD CONSTRAINT affectations_dates_check CHECK (date_fin IS NULL OR date_debut IS NULL OR date_fin >= date_debut)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS affectations_user_role_unite_unique');
        DB::statement('ALTER TABLE affectations DROP CONSTRAINT IF EXISTS affectations_dates_check');
        Schema::dropIfExists('affectations');
    }
};
