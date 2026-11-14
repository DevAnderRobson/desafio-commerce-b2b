<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Eventos de integração recebidos de outros sistemas e já tratados.
     *
     * A entrega do RabbitMQ é "pelo menos uma vez": o mesmo evento pode chegar
     * mais de uma vez. A chave única (evento, handler) garante que cada handler
     * trate cada evento uma única vez.
     */
    public function up(): void
    {
        Schema::create('processed_events', function (Blueprint $table) {
            $table->id();
            $table->string('event_id', 100);
            $table->string('handler');
            $table->timestamp('processed_at');

            $table->unique(['event_id', 'handler']);
            $table->index('processed_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('processed_events');
    }
};
