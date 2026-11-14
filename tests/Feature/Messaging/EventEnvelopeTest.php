<?php

use App\Messaging\Contracts\PublishableEvent;
use App\Messaging\EventEnvelope;

function stubEvent(array $data = ['chave' => 'valor']): PublishableEvent
{
    return new readonly class($data) implements PublishableEvent
    {
        public function __construct(private array $data) {}

        public function exchange(): string
        {
            return 'exchange.teste';
        }

        public function routingKey(): string
        {
            return 'entity.action';
        }

        public function version(): int
        {
            return 3;
        }

        public function data(): array
        {
            return $this->data;
        }
    };
}

test('wraps an event into the JSON contract published to other systems', function () {
    $this->freezeTime();

    $envelope = EventEnvelope::wrap(stubEvent(['chave' => 'ação']));

    expect($envelope->exchange)->toBe('exchange.teste')
        ->and(json_decode($envelope->toJson(), true))->toBe([
            'id' => $envelope->id,
            'event' => 'entity.action',
            'version' => 3,
            'occurred_at' => now()->utc()->toIso8601ZuluString(),
            'data' => ['chave' => 'ação'],
        ]);
});

test('generates a distinct uuid for every wrapped event', function () {
    $first = EventEnvelope::wrap(stubEvent());
    $second = EventEnvelope::wrap(stubEvent());

    expect($first->id)->toBeUuid()
        ->and($second->id)->toBeUuid()
        ->and($first->id)->not->toBe($second->id);
});

test('fails fast when the event data cannot be serialized to JSON', function () {
    EventEnvelope::wrap(stubEvent(['total' => NAN]));
})->throws(JsonException::class);
