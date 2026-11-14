<?php

use App\Messaging\Consumer\Disposition;
use App\Messaging\Consumer\IncomingMessageProcessor;
use App\Messaging\Jobs\HandleIncomingEventJob;
use Illuminate\Support\Facades\Queue;
use Tests\Fixtures\Messaging\RecordingEventHandler;

beforeEach(function () {
    config(['messaging.consumers' => [
        'ecommerce.deliveries' => [
            'exchange' => 'deliveries',
            'handlers' => ['delivery.status_updated' => RecordingEventHandler::class],
        ],
    ]]);
});

test('acks a valid event and schedules its handler on the execution queue', function () {
    Queue::fake([HandleIncomingEventJob::class]);

    $disposition = app(IncomingMessageProcessor::class)->process('ecommerce.deliveries', incomingEventBody());

    expect($disposition)->toBe(Disposition::Ack);
    Queue::assertPushed(
        HandleIncomingEventJob::class,
        fn (HandleIncomingEventJob $job) => $job->handler === RecordingEventHandler::class
            && $job->event->id === 'b6f5f6d8-0c1e-4c52-9d0c-4f3b7a2b9e10'
            && $job->event->data['delivery_id'] === 7,
    );
});

test('sends a malformed message to the dead letter queue without scheduling anything', function () {
    Queue::fake([HandleIncomingEventJob::class]);
    $log = fakeLogChannel('messaging_consumer');

    $disposition = app(IncomingMessageProcessor::class)->process('ecommerce.deliveries', 'isto não é json');

    expect($disposition)->toBe(Disposition::DeadLetter)
        ->and($log->hasErrorThatContains('Mensagem inválida'))->toBeTrue()
        ->and($log->getRecords()[0]->context)->toMatchArray(['queue' => 'ecommerce.deliveries', 'body' => 'isto não é json']);
    Queue::assertNothingPushed();
});

test('sends an event without a configured handler to the dead letter queue', function () {
    Queue::fake([HandleIncomingEventJob::class]);
    $log = fakeLogChannel('messaging_consumer');

    $disposition = app(IncomingMessageProcessor::class)->process(
        'ecommerce.deliveries',
        incomingEventBody(['event' => 'delivery.unknown']),
    );

    expect($disposition)->toBe(Disposition::DeadLetter)
        ->and($log->hasErrorThatContains('sem handler'))->toBeTrue()
        ->and($log->getRecords()[0]->context['event'])->toBe('delivery.unknown');
    Queue::assertNothingPushed();
});

test('truncates a long invalid body in the log', function () {
    Queue::fake([HandleIncomingEventJob::class]);
    $log = fakeLogChannel('messaging_consumer');

    app(IncomingMessageProcessor::class)->process('ecommerce.deliveries', str_repeat('x', 5000));

    expect(strlen($log->getRecords()[0]->context['body']))->toBeLessThan(400);
});
