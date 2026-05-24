<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lead_followups', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('business_id');
            $table->uuid('lead_id');
            $table->uuid('assigned_to')->nullable();  // who needs to follow up
            $table->timestamp('follow_up_at');         // when the follow-up is due
            $table->string('note')->nullable();        // optional note from salesperson
            $table->enum('status', ['pending', 'done', 'missed'])->default('pending');
            $table->timestamp('reminded_at')->nullable(); // when reminder was last sent
            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
            $table->foreign('lead_id')->references('id')->on('leads')->onDelete('cascade');

            // reminder queue polls this index every 15 min
            $table->index(['status', 'follow_up_at']);
            $table->index(['business_id', 'lead_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_followups');
    }
};