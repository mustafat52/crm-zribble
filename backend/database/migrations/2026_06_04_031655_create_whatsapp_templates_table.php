<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('business_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('template_id', 100)->nullable();
            $table->string('language', 10)->default('en');
            $table->enum('category', ['UTILITY', 'MARKETING', 'AUTHENTICATION'])->default('UTILITY');
            $table->json('variables')->nullable();
            $table->text('body_text')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['business_id', 'name']);
            $table->index('business_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_templates');
    }
};