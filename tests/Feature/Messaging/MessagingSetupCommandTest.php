<?php

test('shows the configured plan on dry-run without connecting to the broker', function () {
    config([
        'messaging.connection.host' => '127.0.0.1',
        'messaging.connection.port' => 1,
    ]);

    $this->artisan('messaging:setup', ['--dry-run' => true])
        ->expectsOutputToContain('orders [topic]')
        ->expectsOutputToContain('default_dlq')
        ->assertSuccessful();
});

test('fails with a clear message when the broker is unreachable', function () {
    config([
        'messaging.connection.host' => '127.0.0.1',
        'messaging.connection.port' => 1,
        'messaging.connection.connection_timeout' => 1.0,
    ]);

    $this->artisan('messaging:setup')
        ->expectsOutputToContain('Não foi possível comunicar com o broker')
        ->assertFailed();
});

test('fails without touching the broker when the topology configuration is invalid', function () {
    config(['messaging.topology.exchanges' => ['orders' => 'inexistente']]);

    $this->artisan('messaging:setup')
        ->expectsOutputToContain('Configuração de topologia inválida')
        ->assertFailed();
});
