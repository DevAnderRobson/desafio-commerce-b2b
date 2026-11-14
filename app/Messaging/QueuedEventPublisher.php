<?php

namespace App\Messaging;

use App\Messaging\Contracts\EventPublisher;
use App\Messaging\Contracts\PublishableEvent;
use App\Messaging\Jobs\PublishEventJob;
use App\Messaging\Support\MessagingLog;
use JsonException;

/**
 * Implementação padrão do `EventPublisher`.
 *
 * Não fala com o broker: agenda um `PublishEventJob` na fila de execução. O job
 * só é enfileirado após o commit da transação em andamento, então um rollback
 * jamais anuncia um evento de um registro que não existe.
 */
final class QueuedEventPublisher implements EventPublisher
{
    /**
     * @throws JsonException
     */
    public function publish(PublishableEvent $event): void
    {
        $envelope = EventEnvelope::wrap($event);

        PublishEventJob::dispatch($envelope);

        MessagingLog::publisher()->debug('Evento agendado para publicação.', [
            'event_id' => $envelope->id,
            'event' => $envelope->routingKey,
            'exchange' => $envelope->exchange,
        ]);
    }
}
