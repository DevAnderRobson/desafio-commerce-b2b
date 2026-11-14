<?php

use App\Messaging\Contracts\EventTransport;
use App\Messaging\EventEnvelope;
use App\Messaging\Events\OrderCreated;
use App\Messaging\Exceptions\EventPublishingException;

test('fails with a publishing exception when the broker is unreachable', function () {
    config([
        'messaging.connection.host' => '127.0.0.1',
        'messaging.connection.port' => 1,
        'messaging.connection.connection_timeout' => 1.0,
    ]);

    app(EventTransport::class)->send(EventEnvelope::wrap(new OrderCreated(1, 2, 300)));
})->throws(EventPublishingException::class, 'Não foi possível comunicar com o broker');
