<?php

use App\Messaging\Consumer\IncomingEventParser;
use App\Messaging\Exceptions\InvalidIncomingEventException;
use Carbon\CarbonImmutable;

test('parses a valid envelope into an incoming event', function () {
    $event = app(IncomingEventParser::class)->parse(incomingEventBody());

    expect($event->id)->toBe('b6f5f6d8-0c1e-4c52-9d0c-4f3b7a2b9e10')
        ->and($event->event)->toBe('delivery.status_updated')
        ->and($event->version)->toBe(1)
        ->and($event->occurredAt)->toBeInstanceOf(CarbonImmutable::class)
        ->and($event->occurredAt->toIso8601ZuluString())->toBe('2026-11-14T10:00:00Z')
        ->and($event->data)->toBe(['delivery_id' => 7, 'status' => 'in_transit']);
});

test('accepts an event with empty data', function () {
    $event = app(IncomingEventParser::class)->parse(incomingEventBody(['data' => []]));

    expect($event->data)->toBe([]);
});

test('rejects a message that is not a valid envelope', function (string $body) {
    app(IncomingEventParser::class)->parse($body);
})->throws(InvalidIncomingEventException::class)->with([
    'not json' => ['isto não é json'],
    'json scalar' => ['42'],
    'missing id' => fn () => incomingEventBody(['id' => null]),
    'missing event' => fn () => incomingEventBody(['event' => null]),
    'version zero' => fn () => incomingEventBody(['version' => 0]),
    'version not an integer' => fn () => incomingEventBody(['version' => 'um']),
    'unparseable date' => fn () => incomingEventBody(['occurred_at' => 'ontem']),
    'data not an array' => fn () => incomingEventBody(['data' => 'texto']),
    'missing data' => fn () => incomingEventBody(['data' => null]),
]);
