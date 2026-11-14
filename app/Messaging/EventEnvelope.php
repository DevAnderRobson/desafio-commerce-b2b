<?php

namespace App\Messaging;

use App\Messaging\Contracts\PublishableEvent;
use Illuminate\Support\Str;
use JsonException;

/**
 * Envelope imutável de um evento, no formato publicado no broker.
 *
 * O `id` e a data são gerados uma única vez, no momento em que o evento é
 * anunciado, e viajam com o envelope. Assim, retentativas do job publicam sempre
 * o mesmo `id`, que o consumidor usa para ignorar duplicatas.
 *
 * Corpo JSON publicado:
 *   { "id": "<uuid>", "event": "order.created", "version": 1,
 *     "occurred_at": "2026-11-14T10:00:00Z", "data": { ... } }
 */
final readonly class EventEnvelope
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function __construct(
        public string $id,
        public string $exchange,
        public string $routingKey,
        public int $version,
        public string $occurredAt,
        public array $data,
    ) {}

    /**
     * Cria o envelope de um evento.
     *
     * Serializa o corpo já aqui para falhar cedo, na origem do evento, caso os
     * dados não sejam serializáveis em JSON, e não nas retentativas do job.
     *
     * @throws JsonException
     */
    public static function wrap(PublishableEvent $event): self
    {
        $envelope = new self(
            id: (string) Str::uuid(),
            exchange: $event->exchange(),
            routingKey: $event->routingKey(),
            version: $event->version(),
            occurredAt: now()->utc()->toIso8601ZuluString(),
            data: $event->data(),
        );

        $envelope->toJson();

        return $envelope;
    }

    /**
     * @return array{id: string, event: string, version: int, occurred_at: string, data: array<string, mixed>}
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'event' => $this->routingKey,
            'version' => $this->version,
            'occurred_at' => $this->occurredAt,
            'data' => $this->data,
        ];
    }

    /**
     * @throws JsonException
     */
    public function toJson(): string
    {
        return json_encode($this->toArray(), JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
