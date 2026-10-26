<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications_metier', function (Blueprint $table) {
            // Horodate le moment où la demande portée par la notification a été satisfaite.
            $table->timestampTz('traite_le')->nullable()->after('lu_le');
        });
    }

    public function down(): void
    {
        Schema::table('notifications_metier', function (Blueprint $table) {
            $table->dropColumn('traite_le');
        });
    }
};
