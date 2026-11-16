<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->string('product_name')->nullable();
            $table->string('sku', 50)->nullable();
            $table->unsignedBigInteger('list_unit_price_cents')->default(0);
            $table->decimal('promotion_percent', 5, 2)->nullable();
            $table->unsignedBigInteger('line_total_cents')->default(0);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn(['product_name', 'sku', 'list_unit_price_cents', 'promotion_percent', 'line_total_cents']);
        });
    }
};
