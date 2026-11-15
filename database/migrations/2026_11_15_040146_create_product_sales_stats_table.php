<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_sales_stats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedInteger('units_sold')->default(0);
            $table->timestamps();

            $table->index('units_sold');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_sales_stats');
    }
};
