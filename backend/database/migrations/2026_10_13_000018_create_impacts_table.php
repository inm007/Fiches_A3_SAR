<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('impacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiche_id')->constrained('fiches_a3')->restrictOnDelete();
            $table->string('type_impact', 50);
            $table->text('description');
            $table->timestampsTz();

            $table->index(['fiche_id', 'type_impact']);
        });

        DB::statement("ALTER TABLE impacts ADD CONSTRAINT impacts_type_check CHECK (type_impact IN ('HSE', 'PRODUCTION', 'QUALITE', 'ENERGIE', 'SURETE'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE impacts DROP CONSTRAINT IF EXISTS impacts_type_check');
        Schema::dropIfExists('impacts');
    }
};
