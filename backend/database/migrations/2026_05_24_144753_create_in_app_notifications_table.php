<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('in_app_notifications', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('business_id');
            $table->uuid('user_id');              // who receives this notification
            $table->uuid('lead_id')->nullable();  // which lead it's about (nullable for future non-lead notifications)
            $table->string('type');               // e.g. 'lead_created', 'follow_up_due', 'lead_assigned'
            $table->string('title');              // e.g. "New Lead: Ahmed Khan"
            $table->string('body')->nullable();   // e.g. "From website · 0300-1234567"
            $table->string('url')->nullable();    // e.g. "/leads/{id}" — where to go on click
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');

            // indexes for the two queries we run: unread count + recent list
            $table->index(['user_id', 'is_read', 'created_at']);
            $table->index(['business_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('in_app_notifications');
    }
};