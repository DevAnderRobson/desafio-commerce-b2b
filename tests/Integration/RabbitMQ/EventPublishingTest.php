<?php

use App\Messaging\Contracts\EventTransport;
use App\Messaging\Contracts\PublishableEvent;
use App\Messaging\EventEnvelope;
use App\Messaging\Exceptions\EventPublishingException;
use App\Messaging\RabbitMq\RabbitMqConnectionFactory;
use Illuminate\Support\Str;
use PhpAmqpLib\Channel\AMQPChannel;
use PhpAmqpLib\Connection\AMQPStreamConnection;

/*
 * Testes de integração do RabbitMqEventTransport com um RabbitMQ REAL.
 *
 * Pulados sem RABBITMQ_INTEGRATION=true, para não exigir broker no CI. Para rodar:
 *
 *   sail artisan test --group=rabbitmq
 *   (com RABBITMQ_INTEGRATION=true no ambiente)
 *
 * Cada teste usa uma exchange temporária e exclusiva, apagada ao final, para não
 * interferir na topologia real.
 */

pest()->group('rabbitmq');

function eventForExchange(string $exchange, string $routingKey = 'order.created'): EventPublishingStub
{
    return new EventPublishingStub($exchange, $routingKey);
}

final readonly class EventPublishingStub implements PublishableEvent
{
    public function __construct(private string $exchange, private string $routingKey) {}

    public function exchange(): string
    {
        return $this->exchange;
    }

    public function routingKey(): string
    {
        return $this->routingKey;
    }

    public function version(): int
    {
        return 1;
    }

    public function data(): array
    {
        return ['order_id' => 10];
    }
}

beforeEach(function () {
    if (! filter_var(env('RABBITMQ_INTEGRATION'), FILTER_VALIDATE_BOOLEAN)) {
        $this->markTestSkipped('Defina RABBITMQ_INTEGRATION=true e suba o RabbitMQ para rodar.');
    }

    $this->exchange = 'teste.orders.'.Str::lower(Str::random(8));

    /** @var AMQPStreamConnection $connection */
    $connection = app(RabbitMqConnectionFactory::class)->open();
    /** @var AMQPChannel $channel */
    $channel = $connection->channel();

    $this->connection = $connection;
    $this->channel = $channel;

    $channel->exchange_declare($this->exchange, 'topic', false, false, true);
});

afterEach(function () {
    if (! isset($this->channel)) {
        return;
    }

    $this->channel->exchange_delete($this->exchange);
    $this->channel->close();
    $this->connection->close();
});

test('delivers the envelope as persistent JSON to a queue bound to the routing key', function () {
    [$queue] = $this->channel->queue_declare('', false, false, true, true);
    $this->channel->queue_bind($queue, $this->exchange, 'order.*');

    $envelope = EventEnvelope::wrap(eventForExchange($this->exchange));
    app(EventTransport::class)->send($envelope);

    $message = $this->channel->basic_get($queue, true);

    expect($message)->not->toBeNull()
        ->and(json_decode($message->getBody(), true))->toBe($envelope->toArray())
        ->and($message->get('message_id'))->toBe($envelope->id)
        ->and($message->get('type'))->toBe('order.created')
        ->and($message->get('content_type'))->toBe('application/json')
        ->and($message->get('delivery_mode'))->toBe(2);
});

test('fails when no queue is bound to the routing key instead of dropping the message', function () {
    app(EventTransport::class)->send(EventEnvelope::wrap(eventForExchange($this->exchange)));
})->throws(EventPublishingException::class, 'NO_ROUTE');

test('fails when the exchange does not exist', function () {
    app(EventTransport::class)->send(EventEnvelope::wrap(eventForExchange('teste.inexistente.'.Str::random(8))));
})->throws(EventPublishingException::class, 'NOT_FOUND');
