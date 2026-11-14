<?php

use App\Messaging\EventEnvelope;
use App\Messaging\Events\OrderCreated;

test('announces the order on the orders exchange with the agreed contract', function () {
    $this->freezeTime();

    $envelope = EventEnvelope::wrap(new OrderCreated(orderId: 10, customerId: 20, totalInCents: 15990));

    expect($envelope->exchange)->toBe('orders')
        ->and($envelope->routingKey)->toBe('order.created')
        ->and($envelope->toArray())->toBe([
            'id' => $envelope->id,
            'event' => 'order.created',
            'version' => 1,
            'occurred_at' => now()->utc()->toIso8601ZuluString(),
            'data' => [
                'order_id' => 10,
                'customer_id' => 20,
                'total_in_cents' => 15990,
            ],
        ]);
});
