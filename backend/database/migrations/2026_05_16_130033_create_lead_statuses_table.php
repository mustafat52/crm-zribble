<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lead_statuses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('business_id');
            $table->string('name');
            $table->string('color', 7)->default('#6B7280');
            $table->integer('sort_order')->default(0);
            $table->boolean('is_converted')->default(false);
            $table->boolean('is_lost')->default(false);
            $table->boolean('is_terminal')->default(false);
            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
            $table->index('business_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_statuses');
    }
};