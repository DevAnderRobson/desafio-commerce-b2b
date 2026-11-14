<?php

namespace App\Messaging\Topology;

/**
 * Fila durável. Quando `deadLetterRoutingKey` é informada, as mensagens
 * rejeitadas (`nack`/`reject` sem requeue) são roteadas para ela através da
 * exchange `deadLetterExchange` ('' é a exchange padrão, que entrega na fila
 * de mesmo nome).
 */
final readonly class QueueDefinition
{
    public function __construct(
        public string $name,
        public ?string $deadLetterExchange = null,
        public ?string $deadLetterRoutingKey = null,
    ) {}

    /**
     * Argumentos AMQP da fila.
     *
     * @return array<string, string>
     */
    public function arguments(): array
    {
        if ($this->deadLetterRoutingKey === null) {
            return [];
        }

        return [
            'x-dead-letter-exchange' => $this->deadLetterExchange ?? '',
            'x-dead-letter-routing-key' => $this->deadLetterRoutingKey,
        ];
    }
}
