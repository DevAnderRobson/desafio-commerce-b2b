<?php

use App\Messaging\RabbitMq\RabbitMqConnectionFactory;
use Illuminate\Support\Str;
use PhpAmqpLib\Channel\AMQPChannel;
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Exception\AMQPProtocolChannelException;
use PhpAmqpLib\Message\AMQPMessage;
use PhpAmqpLib\Wire\AMQPTable;

/*
 * Integração do `messaging:setup` com um RabbitMQ REAL. Pulado sem
 * RABBITMQ_INTEGRATION=true. Usa nomes temporários, apagados ao final.
 */

pest()->group('rabbitmq');

beforeEach(function () {
    if (! filter_var(env('RABBITMQ_INTEGRATION'), FILTER_VALIDATE_BOOLEAN)) {
        $this->markTestSkipped('Defina RABBITMQ_INTEGRATION=true e suba o RabbitMQ para rodar.');
    }

    $suffix = Str::lower(Str::random(8));
    $this->exchange = "teste.setup.{$suffix}";
    $this->internalQueue = "teste_interna_{$suffix}";
    $this->consumerQueue = "teste_consumidora_{$suffix}";

    config(['messaging.topology' => [
        'exchanges' => [$this->exchange => 'topic'],
        'internal_queues' => [$this->internalQueue],
        'consumer_queues' => [
            $this->consumerQueue => [['exchange' => $this->exchange, 'routing_key' => 'order.*']],
        ],
    ]]);

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

    foreach ([$this->consumerQueue, "{$this->consumerQueue}_dlq", "{$this->internalQueue}_dlq"] as $queue) {
        $cleanupChannel->queue_delete($queue);
    }
    $cleanupChannel->exchange_delete($this->exchange);

    $cleanup->close();

    if ($this->connection->isConnected()) {
        $this->connection->close();
    }
});

test('creates the topology idempotently and routes rejected messages to the dead letter queue', function () {
    $this->artisan('messaging:setup')->assertSuccessful();
    $this->artisan('messaging:setup')->assertSuccessful();

    $this->channel->basic_publish(new AMQPMessage('{"teste":true}'), $this->exchange, 'order.created');

    $message = null;
    for ($attempt = 0; $attempt < 20 && $message === null; $attempt++) {
        $message = $this->channel->basic_get($this->consumerQueue);
        $message ?? usleep(50_000);
    }

    expect($message)->not->toBeNull();

    $this->channel->basic_reject($message->getDeliveryTag(), false);

    $deadLettered = null;
    for ($attempt = 0; $attempt < 20 && $deadLettered === null; $attempt++) {
        $deadLettered = $this->channel->basic_get("{$this->consumerQueue}_dlq", true);
        $deadLettered ?? usleep(50_000);
    }

    expect($deadLettered?->getBody())->toBe('{"teste":true}');
});

test('creates only the dead letter queue of an internal queue, not the queue itself', function () {
    $this->artisan('messaging:setup')->assertSuccessful();

    [, $messages] = $this->channel->queue_declare("{$this->internalQueue}_dlq", true);
    expect($messages)->toBe(0);

    $channel = $this->connection->channel();

    expect(fn () => $channel->queue_declare($this->internalQueue, true))
        ->toThrow(AMQPProtocolChannelException::class, 'NOT_FOUND');
});

test('fails explaining the conflict when a queue already exists with different arguments', function () {
    $this->channel->queue_declare($this->consumerQueue, false, true, false, false, false, new AMQPTable);

    $this->artisan('messaging:setup')
        ->expectsOutputToContain('PRECONDITION_FAILED')
        ->assertFailed();
});
