<?php

namespace App\Messaging\Handlers;

use App\Messaging\Consumer\IncomingEvent;
use App\Messaging\Contracts\EventHandler;
use App\Messaging\Support\MessagingLog;

/**
 * Handler provisório: apenas registra o evento recebido no canal `messaging_consumer`.
 *
 * Serve para observar uma integração nova antes de existir regra de negócio para
 * ela. Troque-o, em `messaging.consumers`, por um handler real quando houver.
 */
final class LogIncomingEventHandler implements EventHandler
{
    public function handle(IncomingEvent $event): void
    {
        MessagingLog::consumer()->info('Evento recebido (handler de log).', [
            'event_id' => $event->id,
            'event' => $event->event,
            'version' => $event->version,
            'occurred_at' => $event->occurredAt->toIso8601ZuluString(),
            'data' => $event->data,
        ]);
    }
}
