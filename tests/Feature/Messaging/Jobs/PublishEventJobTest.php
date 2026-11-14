<?php

use App\Messaging\Contracts\EventTransport;
use App\Messaging\EventEnvelope;
use App\Messaging\Events\OrderCreated;
use App\Messaging\Exceptions\EventPublishingException;
use App\Messaging\Jobs\PublishEventJob;
use Illuminate\Contracts\Debug\ExceptionHandler;
use Mockery\MockInterface;

test('hands the envelope to the transport', function () {
    $envelope = EventEnvelope::wrap(new OrderCreated(1, 2, 300));

    $this->mock(EventTransport::class, function (MockInterface $transport) use ($envelope) {
        $transport->shouldReceive('send')->once()->withArgs(
            fn (EventEnvelope $sent) => $sent->toArray() === $envelope->toArray(),
        );
    });

    PublishEventJob::dispatchSync($envelope);
});

test('lets publishing failures propagate so the queue retries the job', function () {
    $envelope = EventEnvelope::wrap(new OrderCreated(1, 2, 300));

    $this->mock(EventTransport::class, function (MockInterface $transport) use ($envelope) {
        $transport->shouldReceive('send')->once()->andThrow(EventPublishingException::nacked($envelope));
    });

    PublishEventJob::dispatchSync($envelope);
})->throws(EventPublishingException::class);

test('logs the published event only on the messaging publisher channel', function () {
    $messaging = fakeLogChannel('messaging_publisher');
    $default = fakeLogChannel('default_spy');
    config(['logging.default' => 'default_spy']);

    $envelope = EventEnvelope::wrap(new OrderCreated(1, 2, 300));
    $this->mock(EventTransport::class, fn (MockInterface $transport) => $transport->shouldReceive('send')->once());

    PublishEventJob::dispatchSync($envelope);

    expect($messaging->hasInfoThatContains('Evento publicado'))->toBeTrue()
        ->and($messaging->getRecords()[0]->context)->toMatchArray([
            'event_id' => $envelope->id,
            'event' => 'order.created',
            'exchange' => 'orders',
        ])
        ->and($default->getRecords())->toBeEmpty();
});

test('logs on the messaging channel when the attempts are exhausted', function () {
    $messaging = fakeLogChannel('messaging_publisher');
    $envelope = EventEnvelope::wrap(new OrderCreated(1, 2, 300));

    new PublishEventJob($envelope)->failed(EventPublishingException::nacked($envelope));

    expect($messaging->hasErrorThatContains('tentativas esgotadas'))->toBeTrue();
});

test('reports publishing failures to the messaging channel instead of the default one', function () {
    $messaging = fakeLogChannel('messaging_publisher');
    $default = fakeLogChannel('default_spy');
    config(['logging.default' => 'default_spy']);

    $envelope = EventEnvelope::wrap(new OrderCreated(1, 2, 300));

    app(ExceptionHandler::class)->report(EventPublishingException::unroutable($envelope, '312 NO_ROUTE'));

    expect($messaging->hasErrorThatContains('sem destino'))->toBeTrue()
        ->and($messaging->getRecords()[0]->context['event_id'])->toBe($envelope->id)
        ->and($default->getRecords())->toBeEmpty();
});
