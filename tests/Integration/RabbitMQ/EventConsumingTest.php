<?php

use App\Messaging\RabbitMq\RabbitMqConnectionFactory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PhpAmqpLib\Channel\AMQPChannel;
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;
use Tests\Fixtures\Messaging\RecordingEventHandler;

/*
 * Integração do consumo de eventos (`events:consume`) com um RabbitMQ REAL, simulando
 * outro sistema que publica numa exchange. Pulado sem RABBITMQ_INTEGRATION=true.
 * Usa nomes temporários, apagados ao final. QUEUE_CONNECTION=sync nos testes, então
 * o job do handler roda dentro do próprio consumidor.
 */

pest()->group('rabbitmq');

uses(RefreshDatabase::class);

function consumingPublish(AMQPChannel $channel, string $exchange, string $routingKey, string $body): void
{
    $channel->basic_publish(new AMQPMessage($body, ['content_type' => 'application/json']), $exchange, $routingKey);
}

function consumingAwaitMessage(AMQPChannel $channel, string $queue): ?AMQPMessage
{
    for ($attempt = 0; $attempt < 40; $attempt++) {
        $message = $channel->basic_get($queue, true);

        if ($message !== null) {
            return $message;
        }

        usleep(50_000);
    }

    return null;
}

function consumingQueueSize(AMQPChannel $channel, string $queue, int $expected): int
{
    $size = -1;

    for ($attempt = 0; $attempt < 40 && $size !== $expected; $attempt++) {
        [, $size] = $channel->queue_declare($queue, true);
        $size === $expected || usleep(50_000);
    }

    return $size;
}

beforeEach(function () {
    if (! filter_var(env('RABBITMQ_INTEGRATION'), FILTER_VALIDATE_BOOLEAN)) {
        $this->markTestSkipped('Defina RABBITMQ_INTEGRATION=true e suba o RabbitMQ para rodar.');
    }

    $suffix = Str::lower(Str::random(8));
    $this->exchange = "teste.deliveries.{$suffix}";
    $this->queue = "teste_ecommerce_deliveries_{$suffix}";
    $this->deadLetterQueue = "{$this->queue}_dlq";
    $this->handler = recordingHandler();

    config([
        'messaging.topology' => ['exchanges' => [$this->exchange => 'topic'], 'internal_queues' => []],
        'messaging.consumers' => [
            $this->queue => [
                'exchange' => $this->exchange,
                'handlers' => ['delivery.status_updated' => RecordingEventHandler::class],
            ],
        ],
        'messaging.consumer.wait_timeout' => 1,
    ]);

    /** @var AMQPStreamConnection $connection */
    $connection = app(RabbitMqConnectionFactory::class)->open();
    /** @var AMQPChannel $channel */
    $channel = $connection->channel();

    $this->connection = $connection;
    $this->channel = $channel;
});

afterEach(function () {
    if (! isset($this->channel)) {
        return;
    }

    $cleanup = app(RabbitMqConnectionFactory::class)->open();
    $cleanupChannel = $cleanup->channel();

    $cleanupChannel->queue_delete($this->queue);
    $cleanupChannel->queue_delete($this->deadLetterQueue);
    $cleanupChannel->exchange_delete($this->exchange);
    $cleanup->close();

    if ($this->connection->isConnected()) {
        $this->connection->close();
    }
});

test('consumes a published event, runs its handler once and acks the message', function () {
    $this->artisan('messaging:setup')->assertSuccessful();

    consumingPublish($this->channel, $this->exchange, 'delivery.status_updated', incomingEventBody());

    $this->artisan('events:consume', ['queue' => $this->queue, '--stop-when-empty' => true])
        ->expectsOutputToContain('Mensagens tratadas: 1')
        ->assertSuccessful();

    expect($this->handler->handled)->toHaveCount(1)
        ->and($this->handler->handled[0]->data)->toBe(['delivery_id' => 7, 'status' => 'in_transit'])
        ->and(DB::table('processed_events')->count())->toBe(1)
        ->and(consumingQueueSize($this->channel, $this->queue, 0))->toBe(0)
        ->and(consumingQueueSize($this->channel, $this->deadLetterQueue, 0))->toBe(0);
});

test('runs the handler only once when the same event is delivered twice', function () {
    $this->artisan('messaging:setup')->assertSuccessful();

    consumingPublish($this->channel, $this->exchange, 'delivery.status_updated', incomingEventBody());
    consumingPublish($this->channel, $this->exchange, 'delivery.status_updated', incomingEventBody());

    $this->artisan('events:consume', ['queue' => $this->queue, '--stop-when-empty' => true])
        ->expectsOutputToContain('Mensagens tratadas: 2')
        ->assertSuccessful();

    expect($this->handler->handled)->toHaveCount(1)
        ->and(DB::table('processed_events')->count())->toBe(1);
});

test('sends a malformed message to the dead letter queue', function () {
    $this->artisan('messaging:setup')->assertSuccessful();

    consumingPublish($this->channel, $this->exchange, 'delivery.status_updated', 'isto não é json');

    $this->artisan('events:consume', ['queue' => $this->queue, '--stop-when-empty' => true])->assertSuccessful();

    $deadLettered = consumingAwaitMessage($this->channel, $this->deadLetterQueue);

    expect($deadLettered?->getBody())->toBe('isto não é json')
        ->and($this->handler->handled)->toBeEmpty()
        ->and(consumingQueueSize($this->channel, $this->queue, 0))->toBe(0);
});

test('sends a valid event without a configured handler to the dead letter queue', function () {
    $this->artisan('messaging:setup')->assertSuccessful();

    $unhandled = incomingEventBody(['event' => 'delivery.unknown']);
    // Pela exchange padrão, o evento chega à fila mesmo sem binding para sua routing key.
    consumingPublish($this->channel, '', $this->queue, $unhandled);

    $this->artisan('events:consume', ['queue' => $this->queue, '--stop-when-empty' => true])->assertSuccessful();

    expect(consumingAwaitMessage($this->channel, $this->deadLetterQueue)?->getBody())->toBe($unhandled)
        ->and($this->handler->handled)->toBeEmpty();
});

test('stops after the message limit and leaves the remaining messages in the queue', function () {
    $this->artisan('messaging:setup')->assertSuccessful();

    consumingPublish($this->channel, $this->exchange, 'delivery.status_updated', incomingEventBody(['id' => 'evt-1']));
    consumingPublish($this->channel, $this->exchange, 'delivery.status_updated', incomingEventBody(['id' => 'evt-2']));

    $this->artisan('events:consume', ['queue' => $this->queue, '--max-messages' => 1])
        ->expectsOutputToContain('Mensagens tratadas: 1')
        ->assertSuccessful();

    expect($this->handler->handled)->toHaveCount(1)
        ->and(consumingQueueSize($this->channel, $this->queue, 1))->toBe(1);
});

test('fails telling to run the setup when the queue does not exist', function () {
    $this->artisan('events:consume', ['queue' => $this->queue, '--stop-when-empty' => true])
        ->expectsOutputToContain('não existe no broker')
        ->assertFailed();
});
