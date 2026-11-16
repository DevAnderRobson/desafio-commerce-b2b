<?php

namespace App\Messaging\Events;

use App\Messaging\Contracts\PublishableEvent;

/**
 * Anuncia que o pagamento de um pedido foi aprovado.
 *
 * Exchange `orders`, routing key `order.paid`; valores em centavos.
 */
final readonly class OrderPaid implements PublishableEvent
{
    public const string EXCHANGE = 'orders';

    public const string ROUTING_KEY = 'order.paid';

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
