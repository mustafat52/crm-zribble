<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agency_business_assignments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('business_id')->constrained('businesses')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'business_id']);
            $table->index('user_id');
            $table->index('business_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agency_business_assignments');
    }
};