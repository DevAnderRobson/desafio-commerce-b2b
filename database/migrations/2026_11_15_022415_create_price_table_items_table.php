<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('price_table_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('price_table_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('price_cents');
            $table->unsignedBigInteger('wholesale_price_cents')->nullable();
            $table->unsignedInteger('wholesale_min_quantity')->nullable();
            $table->timestamps();

            $table->unique(['price_table_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('price_table_items');
    }
};
