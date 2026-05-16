<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('businesses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('whatsapp_number', 20)->nullable();
            $table->string('whatsapp_provider', 50)->default('mock');
            $table->json('whatsapp_config')->nullable();
            $table->string('timezone', 50)->default('Asia/Kolkata');
            $table->enum('plan', ['free', 'starter', 'pro', 'enterprise'])->default('free');
            $table->json('features')->default('{"ai":false,"automations":false,"advanced_reports":false}');
            $table->json('settings')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('businesses');
    }
};