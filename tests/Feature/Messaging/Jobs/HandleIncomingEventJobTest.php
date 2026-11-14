<?php

use App\Messaging\Consumer\IncomingEvent;
use App\Messaging\Handlers\LogIncomingEventHandler;
use App\Messaging\Jobs\HandleIncomingEventJob;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Tests\Fixtures\Messaging\RecordingEventHandler;

function incomingEvent(string $id = 'evt-1'): IncomingEvent
{
    return new IncomingEvent($id, 'delivery.status_updated', 1, CarbonImmutable::parse('2026-11-14T10:00:00Z'), ['delivery_id' => 7]);
}

test('runs the handler and records the event as processed', function () {
    $handler = recordingHandler();

    HandleIncomingEventJob::dispatchSync(incomingEvent(), RecordingEventHandler::class);

    expect($handler->handled)->toHaveCount(1)
        ->and($handler->handled[0]->data)->toBe(['delivery_id' => 7])
        ->and(DB::table('processed_events')->where('event_id', 'evt-1')->where('handler', RecordingEventHandler::class)->count())->toBe(1);
});

test('ignores a duplicate delivery of the same event for the same handler', function () {
    $handler = recordingHandler();
    $log = fakeLogChannel('messaging_consumer');

    HandleIncomingEventJob::dispatchSync(incomingEvent(), RecordingEventHandler::class);
    HandleIncomingEventJob::dispatchSync(incomingEvent(), RecordingEventHandler::class);

    expect($handler->handled)->toHaveCount(1)
        ->and(DB::table('processed_events')->count())->toBe(1)
        ->and($log->hasInfoThatContains('duplicado ignorado'))->toBeTrue();
});

test('runs every handler configured for the same event', function () {
    $recording = recordingHandler();
    $log = fakeLogChannel('messaging_consumer');

    HandleIncomingEventJob::dispatchSync(incomingEvent(), RecordingEventHandler::class);
    HandleIncomingEventJob::dispatchSync(incomingEvent(), LogIncomingEventHandler::class);

    expect($recording->handled)->toHaveCount(1)
        ->and($log->hasInfoThatContains('handler de log'))->toBeTrue()
        ->and(DB::table('processed_events')->count())->toBe(2);
});

test('treats events with different ids independently', function () {
    $handler = recordingHandler();

    HandleIncomingEventJob::dispatchSync(incomingEvent('evt-1'), RecordingEventHandler::class);
    HandleIncomingEventJob::dispatchSync(incomingEvent('evt-2'), RecordingEventHandler::class);

    expect($handler->handled)->toHaveCount(2);
});

test('undoes the idempotency record when the handler fails so the retry runs it again', function () {
    $handler = recordingHandler();
    $handler->failNext = true;
    $log = fakeLogChannel('messaging_consumer');

    expect(fn () => HandleIncomingEventJob::dispatchSync(incomingEvent(), RecordingEventHandler::class))
        ->toThrow(RuntimeException::class, 'Falha simulada');

    expect(DB::table('processed_events')->count())->toBe(0)
        ->and($handler->handled)->toBeEmpty()
        ->and($log->hasWarningThatContains('Falha ao tratar o evento'))->toBeTrue();

    HandleIncomingEventJob::dispatchSync(incomingEvent(), RecordingEventHandler::class);

    expect($handler->handled)->toHaveCount(1)
        ->and(DB::table('processed_events')->count())->toBe(1);
});

test('logs on the consumer channel when the attempts are exhausted', function () {
    $log = fakeLogChannel('messaging_consumer');

    (new HandleIncomingEventJob(incomingEvent(), RecordingEventHandler::class))->failed(new RuntimeException('boom'));

    expect($log->hasErrorThatContains('tentativas esgotadas'))->toBeTrue()
        ->and($log->getRecords()[0]->context)->toMatchArray(['event_id' => 'evt-1', 'error' => 'boom']);
});
