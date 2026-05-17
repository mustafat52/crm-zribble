<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('login_history', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // users.id is bigint (Laravel default), businesses.id is UUID
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('business_id')->nullable()->constrained()->cascadeOnDelete();

            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('device_name')->nullable();
            $table->string('device_type')->nullable(); // web / mobile / api

            // success / failed / suspicious
            $table->enum('outcome', ['success', 'failed', 'suspicious'])->default('success');
            $table->string('failure_reason')->nullable();

            $table->timestamp('logged_in_at');

            $table->index(['user_id', 'logged_in_at']);
            $table->index(['business_id', 'logged_in_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('login_history');
    }
};