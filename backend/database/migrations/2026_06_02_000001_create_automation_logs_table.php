<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('automation_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('lead_id')->nullable();          // which lead triggered this
            $table->uuid('user_id')->nullable();          // who received the automation (nullable — customer emails have no user_id)
            $table->string('automation_type', 50);        // stale_lead_nudge | followup_customer_email
            $table->string('channel', 20)->default('email'); // email | whatsapp (WA added in TWA tasks)
            $table->string('recipient_email')->nullable();
            $table->string('status', 20)->default('sent');   // sent | failed | skipped
            $table->text('error_message')->nullable();
            $table->json('metadata')->nullable();             // extra context (days_stale, followup_id, etc.)
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('business_id')->references('id')->on('businesses')->cascadeOnDelete();
            $table->foreign('lead_id')->references('id')->on('leads')->nullOnDelete();

            // Indexes for dashboard/reporting queries later
            $table->index(['business_id', 'automation_type', 'created_at']);
            $table->index(['lead_id', 'automation_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('automation_logs');
    }
};