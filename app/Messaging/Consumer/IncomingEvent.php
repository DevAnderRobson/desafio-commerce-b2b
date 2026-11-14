<?php

namespace App\Messaging\Consumer;

use Carbon\CarbonImmutable;

/**
 * Evento de integração recebido de outro sistema, já validado.
 *
 * Mesmo formato do envelope que publicamos:
 *   { "id": "...", "event": "delivery.status_updated", "version": 1,
 *     "occurred_at": "2026-11-14T10:00:00Z", "data": { ... } }
 */
final readonly class IncomingEvent
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function __construct(
        public string $id,
        public string $event,
        public int $version,
        public CarbonImmutable $occurredAt,
        public array $data,
    ) {}
}
