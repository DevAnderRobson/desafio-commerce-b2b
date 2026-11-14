<?php

namespace App\Messaging\Consumer;

use Illuminate\Support\Facades\DB;

/**
 * Registro de eventos já tratados, para idempotência (tabela `processed_events`).
 *
 * Use `claim()` dentro da mesma transação que executa o handler: se ela sofrer
 * rollback, o registro some e o evento pode ser tratado de novo.
 *
 * A tabela cresce com o tempo. Quando o volume justificar, apague por
 * `processed_at` os registros mais antigos que a janela em que o outro sistema
 * pode reentregar um evento.
 */
final class ProcessedEventStore
{
    /**
     * Reserva o evento para o handler. Retorna `false` se já foi tratado (ou se
     * outra transação concorrente o reservou), e então o handler não deve rodar.
     */
    public function claim(string $eventId, string $handler): bool
    {
        return DB::table('processed_events')->insertOrIgnore([
            'event_id' => $eventId,
            'handler' => $handler,
            'processed_at' => now(),
        ]) === 1;
    }
}
