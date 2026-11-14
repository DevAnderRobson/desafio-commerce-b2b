<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Monolog\Handler\NullHandler;
use Monolog\Handler\TestHandler;
use Tests\Fixtures\Messaging\RecordingEventHandler;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

pest()->extend(TestCase::class)
    ->in('Integration');

/*
 * Os canais de log de messaging escrevem em storage/logs/messaging/. Nos testes
 * eles descartam tudo, para que a execução da suíte não polua os logs reais.
 * Os testes que verificam logs trocam o canal por um handler em memória
 * (fakeLogChannel).
 */
pest()->beforeEach(function () {
    foreach (['messaging_publisher', 'messaging_topology', 'messaging_consumer'] as $channel) {
        config(["logging.channels.{$channel}" => ['driver' => 'monolog', 'handler' => NullHandler::class]]);
    }
})->in('Feature', 'Integration');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

function something()
{
    // ..
}

/**
 * Corpo JSON de um evento de integração recebido de outro sistema. Passar `null`
 * em uma chave a invalida (equivale a ausente).
 *
 * @param  array<string, mixed>  $overrides
 */
function incomingEventBody(array $overrides = []): string
{
    return json_encode([
        'id' => 'b6f5f6d8-0c1e-4c52-9d0c-4f3b7a2b9e10',
        'event' => 'delivery.status_updated',
        'version' => 1,
        'occurred_at' => '2026-11-14T10:00:00Z',
        'data' => ['delivery_id' => 7, 'status' => 'in_transit'],
        ...$overrides,
    ], JSON_THROW_ON_ERROR);
}

/**
 * Registra no container um `RecordingEventHandler` único e o devolve.
 */
function recordingHandler(): RecordingEventHandler
{
    $handler = new RecordingEventHandler;
    app()->instance(RecordingEventHandler::class, $handler);

    return $handler;
}

/**
 * Troca o canal de log informado por um handler em memória e o devolve, para
 * que o teste confirme em qual canal um registro foi escrito.
 */
function fakeLogChannel(string $channel): TestHandler
{
    config(["logging.channels.{$channel}" => ['driver' => 'monolog', 'handler' => TestHandler::class]]);
    Log::forgetChannel($channel);

    /** @var TestHandler */
    return Log::channel($channel)->getLogger()->getHandlers()[0];
}
