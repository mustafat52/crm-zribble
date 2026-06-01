<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->text('endpoint');                // browser push endpoint URL (unique per device)
            $table->text('p256dh');                  // public encryption key from browser
            $table->text('auth');                    // auth secret from browser
            $table->string('user_agent')->nullable(); // optional: track which device/browser
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();

            // One user can have multiple subscriptions (multiple devices/browsers)
            // But endpoint must be unique — same browser won't subscribe twice
            $table->unique('endpoint');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};