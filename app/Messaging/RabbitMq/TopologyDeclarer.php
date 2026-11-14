<?php

namespace App\Messaging\RabbitMq;

use App\Messaging\Exceptions\TopologyException;
use App\Messaging\Support\MessagingLog;
use App\Messaging\Topology\TopologyPlan;
use Closure;
use Exception;
use PhpAmqpLib\Channel\AMQPChannel;
use PhpAmqpLib\Connection\AbstractConnection;
use PhpAmqpLib\Exception\AMQPExceptionInterface;
use PhpAmqpLib\Exception\AMQPProtocolChannelException;
use PhpAmqpLib\Wire\AMQPTable;
use Throwable;

/**
 * Aplica um `TopologyPlan` no RabbitMQ. As declarações são idempotentes.
 *
 * Cada declaração usa um canal próprio: quando o broker recusa uma delas (por
 * exemplo, fila já existente com argumentos diferentes) ele fecha o canal, e
 * isso não pode contaminar as demais. A conexão e os canais são sempre fechados.
 * Cada passo é registrado no canal de log `messaging_topology`.
 */
final class TopologyDeclarer
{
    public function __construct(private readonly RabbitMqConnectionFactory $connections) {}

    /**
     * @throws TopologyException|Exception
     */
    public function apply(TopologyPlan $plan): void
    {
        $connection = null;

        try {
            $connection = $this->connections->open();

            foreach ($plan->exchanges as $exchange) {
                $this->declare(
                    $connection,
                    "exchange {$exchange->name}",
                    fn (AMQPChannel $channel) => $channel->exchange_declare($exchange->name, $exchange->type, false, true, false),
                    ['type' => 'exchange', 'name' => $exchange->name, 'exchange_type' => $exchange->type],
                );
            }

            foreach ($plan->queues as $queue) {
                $this->declare(
                    $connection,
                    "fila {$queue->name}",
                    fn (AMQPChannel $channel) => $channel->queue_declare($queue->name, false, true, false, false, false, new AMQPTable($queue->arguments())),
                    ['type' => 'queue', 'name' => $queue->name, 'arguments' => $queue->arguments()],
                );
            }

            foreach ($plan->bindings as $binding) {
                $this->declare(
                    $connection,
                    "binding {$binding->queue} <- {$binding->exchange} [{$binding->routingKey}]",
                    fn (AMQPChannel $channel) => $channel->queue_bind($binding->queue, $binding->exchange, $binding->routingKey),
                    ['type' => 'binding', 'queue' => $binding->queue, 'exchange' => $binding->exchange, 'routing_key' => $binding->routingKey],
                );
            }
        } catch (AMQPExceptionInterface $exception) {
            MessagingLog::topology()->error('Falha de comunicação com o broker ao aplicar a topologia.', ['error' => $exception->getMessage()]);

            throw TopologyException::unreachable($exception);
        } finally {
            $this->closeQuietly($connection);
        }
    }

    /**
     * @param  Closure(AMQPChannel): mixed  $operation
     * @param  array<string, mixed>  $context
     *
     * @throws TopologyException
     */
    private function declare(AbstractConnection $connection, string $resource, Closure $operation, array $context): void
    {
        $channel = $connection->channel();

        try {
            $operation($channel);

            MessagingLog::topology()->info('Topologia declarada.', $context);
        } catch (AMQPProtocolChannelException $exception) {
            MessagingLog::topology()->error('O broker recusou a declaração.', [...$context, 'error' => $exception->getMessage()]);

            throw TopologyException::rejected($resource, $exception);
        } finally {
            try {
                $channel->close();
            } catch (Throwable) {
            }
        }
    }

    private function closeQuietly(?AbstractConnection $connection): void
    {
        try {
            $connection?->close();
        } catch (Throwable) {
        }
    }
}
