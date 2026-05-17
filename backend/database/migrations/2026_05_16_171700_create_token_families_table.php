<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('token_families', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // users.id is bigint (Laravel default), businesses.id is UUID
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('business_id')->nullable()->constrained()->cascadeOnDelete();

            // Groups all tokens from the same login session.
            // Stolen token detected = entire family invalidated = all devices logged out.
            $table->string('family_id')->index();

            // Only the hash is stored — never the plain refresh token.
            $table->string('refresh_token_hash');

            $table->string('device_name')->nullable();
            $table->string('device_type')->nullable(); // web / mobile / api
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();

            // Refresh tokens are long-lived (30 days).
            $table->timestamp('expires_at');

            // Flipped to true when a stolen token is detected.
            $table->boolean('is_invalidated')->default(false);
            $table->timestamp('invalidated_at')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'family_id']);
            $table->index(['user_id', 'is_invalidated']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('token_families');
    }
};