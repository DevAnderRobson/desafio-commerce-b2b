<?php

namespace App\Messaging\Events;

use App\Messaging\Contracts\PublishableEvent;

/**
 * Anuncia a outros sistemas que um pedido foi criado.
 *
 * Exchange `orders`, routing key `order.created`. Os valores monetários trafegam
 * em centavos (inteiro) para não depender de ponto flutuante entre sistemas.
 */
final readonly class OrderCreated implements PublishableEvent
{
    public const string EXCHANGE = 'orders';

    public const string ROUTING_KEY = 'order.created';

    public function __construct(
        public int $orderId,
        public int $customerId,
        public int $totalInCents,
    ) {}

    public function exchange(): string
    {
        return self::EXCHANGE;
    }

    public function routingKey(): string
    {
        return self::ROUTING_KEY;
    }

    public function version(): int
    {
        return 1;
    }

    /**
     * @return array{order_id: int, customer_id: int, total_in_cents: int}
     */
    public function data(): array
    {
        return [
            'order_id' => $this->orderId,
            'customer_id' => $this->customerId,
            'total_in_cents' => $this->totalInCents,
        ];
    }
}
