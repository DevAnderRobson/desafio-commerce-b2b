<?php

use Tests\Fixtures\Messaging\RecordingEventHandler;

test('fails listing the available queues when the queue is not configured', function () {
    $this->artisan('events:consume', ['queue' => 'fila.inexistente'])
        ->expectsOutputToContain('não está em messaging.consumers. Filas disponíveis: ecommerce.deliveries.')
        ->assertFailed();
});

test('fails before connecting when a configured handler is invalid', function () {
    config(['messaging.consumers' => [
        'ecommerce.deliveries' => ['exchange' => 'deliveries', 'handlers' => ['delivery.status_updated' => stdClass::class]],
    ]]);

    $this->artisan('events:consume', ['queue' => 'ecommerce.deliveries'])
        ->expectsOutputToContain('não existe ou não implementa')
        ->assertFailed();
});

test('fails with a clear message when the broker is unreachable', function () {
    config([
        'messaging.connection.host' => '127.0.0.1',
        'messaging.connection.port' => 1,
        'messaging.connection.connection_timeout' => 1.0,
        'messaging.consumers' => [
            'ecommerce.deliveries' => ['exchange' => 'deliveries', 'handlers' => ['delivery.status_updated' => RecordingEventHandler::class]],
        ],
    ]);
    $log = fakeLogChannel('messaging_consumer');

    $this->artisan('events:consume', ['queue' => 'ecommerce.deliveries', '--stop-when-empty' => true])
        ->expectsOutputToContain('Falha de comunicação com o broker')
        ->assertFailed();

    expect($log->hasInfoThatContains('Consumidor encerrado'))->toBeTrue();
});
