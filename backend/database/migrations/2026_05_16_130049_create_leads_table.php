<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leads', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->uuid('branch_id')->nullable();
            $table->uuid('assigned_to')->nullable();
            $table->uuid('lead_status_id')->nullable();
            $table->string('name');
            $table->string('mobile', 20);
            $table->string('email')->nullable();
            $table->string('source', 100)->default('manual');
            $table->string('campaign')->nullable();
            $table->string('city', 100)->nullable();
            $table->text('interested_in')->nullable();
            $table->decimal('lead_value', 12, 2)->nullable();
            $table->json('tags')->nullable();
            $table->json('custom_fields')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('last_contacted_at')->nullable();
            $table->timestamp('next_followup_at')->nullable();
            $table->timestamp('converted_at')->nullable();
            $table->string('lost_reason')->nullable();
            $table->uuid('duplicate_of')->nullable();
            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
            $table->foreign('branch_id')->references('id')->on('branches')->onDelete('set null');
            $table->foreign('lead_status_id')->references('id')->on('lead_statuses')->onDelete('set null');

            $table->index('business_id');
            $table->index('branch_id');
            $table->index('assigned_to');
            $table->index('mobile');
            $table->index('next_followup_at');
            $table->index('last_contacted_at');
            $table->index(['business_id', 'source']);
            $table->index(['business_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};