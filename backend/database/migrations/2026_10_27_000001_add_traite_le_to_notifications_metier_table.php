<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('notifications_metier', 'traite_le')) {
            Schema::table('notifications_metier', function (Blueprint $table): void {
                $table->timestampTz('traite_le')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('notifications_metier', 'traite_le')) {
            Schema::table('notifications_metier', function (Blueprint $table): void {
                $table->dropColumn('traite_le');
            });
        }
    }
};
