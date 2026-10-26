<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('journal_administration', function (Blueprint $table) {
            $table->id();
            $table->foreignId('auteur_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('operation', 100);
            $table->string('objet', 100)->nullable();
            $table->jsonb('detail')->nullable();
            $table->timestampTz('created_at')->useCurrent();

            $table->index(['objet', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journal_administration');
    }
};
