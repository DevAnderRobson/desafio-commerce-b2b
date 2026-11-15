<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('cnpj')->index();
            $table->string('legal_name');
            $table->string('trade_name')->nullable();
            $table->string('city')->nullable();
            $table->string('state', 2)->nullable();
            $table->foreignId('price_table_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedBigInteger('credit_limit_cents')->default(0);
            $table->unsignedBigInteger('credit_used_cents')->default(0);
            $table->boolean('is_blocked')->default(false);
            $table->string('approval_status')->default('pending')->index();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('duplicate_of_customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->timestamps();
        });

        // Only the original registration of a CNPJ is unique; duplicated sign-ups are kept
        // as pending records flagged for the store owner (see D19).
        DB::statement('CREATE UNIQUE INDEX customers_cnpj_original_unique ON customers (cnpj) WHERE duplicate_of_customer_id IS NULL');
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
