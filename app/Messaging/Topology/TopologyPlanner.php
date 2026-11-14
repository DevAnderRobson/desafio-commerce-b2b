<?php

namespace App\Messaging\Topology;

use Illuminate\Container\Attributes\Config;
use InvalidArgumentException;

/**
 * Converte a seção `topology` do `config/messaging.php` em um `TopologyPlan`.
 *
 * Não acessa o broker: apenas valida a configuração e decide o que declarar.
 * O nome da DLQ e a exchange de dead letter vêm do `config/queue.php`, a mesma
 * fonte do driver da fila de execução, para que os dois nunca divirjam.
 */
final class TopologyPlanner
{
    private const array EXCHANGE_TYPES = ['direct', 'topic', 'fanout', 'headers'];

    /**
     * @param  array{exchanges?: array<string, string>, internal_queues?: list<string>}  $topology
     * @param  array<string, array{exchange: string, handlers: array<string, string>}>  $consumers
     */
    public function __construct(
        #[Config('messaging.topology')] private readonly array $topology,
        #[Config('messaging.consumers')] private readonly array $consumers,
        #[Config('queue.connections.rabbitmq.options.queue.failed_exchange')] private readonly string $failedExchange,
        #[Config('queue.connections.rabbitmq.options.queue.failed_routing_key')] private readonly string $failedRoutingKey,
    ) {}

    /**
     * @throws InvalidArgumentException quando a configuração é inválida
     */
    public function plan(): TopologyPlan
    {
        if ($this->failedExchange !== '') {
            throw new InvalidArgumentException(
                'O setup só suporta DLQ pela exchange padrão: "queue.connections.rabbitmq.options.queue.failed_exchange" deve ser vazio.',
            );
        }

        $exchanges = $this->exchanges();

        /** @var array<string, QueueDefinition> $queues */
        $queues = [];
        $bindings = [];

        foreach ($this->topology['internal_queues'] ?? [] as $queue) {
            $deadLetter = $this->deadLetterQueueFor($queue);
            $queues[$deadLetter] = new QueueDefinition($deadLetter);
        }

        foreach ($this->consumers as $queue => $consumer) {
            if (! isset($exchanges[$consumer['exchange']])) {
                throw new InvalidArgumentException(sprintf(
                    'A fila consumidora "%s" liga-se à exchange "%s", que não está em messaging.topology.exchanges.',
                    $queue,
                    $consumer['exchange'],
                ));
            }

            $deadLetter = $this->deadLetterQueueFor($queue);
            $queues[$deadLetter] = new QueueDefinition($deadLetter);
            $queues[$queue] = new QueueDefinition($queue, $this->failedExchange, $deadLetter);

            foreach (array_keys($consumer['handlers']) as $routingKey) {
                $bindings[] = new BindingDefinition($queue, $consumer['exchange'], $routingKey);
            }
        }

        return new TopologyPlan(
            array_values($exchanges),
            $this->orderedQueues($queues),
            $bindings,
        );
    }

    /**
     * @return array<string, ExchangeDefinition>
     */
    private function exchanges(): array
    {
        $exchanges = [];

        foreach ($this->topology['exchanges'] ?? [] as $name => $type) {
            if (! in_array($type, self::EXCHANGE_TYPES, true)) {
                throw new InvalidArgumentException(sprintf(
                    'Tipo de exchange inválido "%s" para "%s". Use: %s.',
                    $type,
                    $name,
                    implode(', ', self::EXCHANGE_TYPES),
                ));
            }

            $exchanges[$name] = new ExchangeDefinition($name, $type);
        }

        return $exchanges;
    }

    /**
     * Mesma regra do driver da fila: `failed_routing_key` aplicado ao nome da fila.
     */
    private function deadLetterQueueFor(string $queue): string
    {
        return ltrim(sprintf($this->failedRoutingKey, $queue), '.');
    }

    /**
     * Coloca as DLQs (sem dead letter) antes das filas que dependem delas.
     *
     * @param  array<string, QueueDefinition>  $queues
     * @return list<QueueDefinition>
     */
    private function orderedQueues(array $queues): array
    {
        $deadLetterQueues = array_filter($queues, fn (QueueDefinition $queue) => $queue->deadLetterRoutingKey === null);
        $consumerQueues = array_filter($queues, fn (QueueDefinition $queue) => $queue->deadLetterRoutingKey !== null);

        return array_values([...$deadLetterQueues, ...$consumerQueues]);
    }
}
