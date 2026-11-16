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
        Schema::table('orders', function (Blueprint $table) {
            $table->string('payment_term_code', 20)->nullable();
            $table->string('payment_term_label')->nullable();
            $table->decimal('surcharge_percent', 5, 2)->default(0);
            $table->boolean('is_deferred')->default(false);
            $table->unsignedBigInteger('subtotal_cents')->default(0);
            $table->unsignedBigInteger('savings_cents')->default(0);
            $table->unsignedBigInteger('shipping_cents')->default(0);
            $table->unsignedBigInteger('surcharge_cents')->default(0);
            $table->unsignedBigInteger('total_cents')->default(0);
            $table->unsignedBigInteger('credit_reserved_cents')->default(0);
            $table->string('reservation_state', 20)->default('none');
            $table->string('freight_code', 30)->nullable();
            $table->string('freight_label')->nullable();
            $table->json('address_snapshot')->nullable();
            $table->string('idempotency_key', 64)->nullable()->unique();
            $table->timestamp('paid_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'payment_term_code', 'payment_term_label', 'surcharge_percent', 'is_deferred', 'subtotal_cents',
                'savings_cents', 'shipping_cents', 'surcharge_cents', 'total_cents', 'credit_reserved_cents',
                'reservation_state', 'freight_code', 'freight_label', 'address_snapshot', 'idempotency_key', 'paid_at',
            ]);
        });
    }
};
