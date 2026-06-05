<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_conversations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('business_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('lead_id')->nullable()->constrained()->cascadeOnDelete();
            $table->enum('direction', ['outbound', 'inbound'])->default('outbound');
            $table->string('message_id', 100)->nullable();  // Meta's message ID
            $table->string('template_name', 100)->nullable();
            $table->text('body')->nullable();               // actual message text shown to user
            $table->enum('status', ['sent', 'delivered', 'read', 'failed', 'skipped'])->default('sent');
            $table->string('recipient', 20)->nullable();    // phone number it was sent to
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['business_id', 'lead_id']);
            $table->index(['lead_id', 'sent_at']);
            $table->index('message_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_conversations');
    }
};