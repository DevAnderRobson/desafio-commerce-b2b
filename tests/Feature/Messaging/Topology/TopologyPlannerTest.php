<?php

use App\Messaging\Topology\BindingDefinition;
use App\Messaging\Topology\TopologyPlanner;

function plannerFor(array $topology, string $failedExchange = '', string $failedRoutingKey = '%s_dlq'): TopologyPlanner
{
    return new TopologyPlanner($topology, $failedExchange, $failedRoutingKey);
}

test('declares only the dead letter queue of internal queues, leaving the main queue to the queue driver', function () {
    $plan = plannerFor(['internal_queues' => ['default']])->plan();

    expect(collect($plan->queues)->pluck('name')->all())->toBe(['default_dlq'])
        ->and($plan->queues[0]->arguments())->toBe([]);
});

test('declares a consumer queue with its dead letter queue and bindings', function () {
    $plan = plannerFor([
        'exchanges' => ['billing' => 'topic'],
        'consumer_queues' => [
            'ecommerce.billing' => [
                ['exchange' => 'billing', 'routing_key' => 'invoice.issued'],
                ['exchange' => 'billing', 'routing_key' => 'invoice.cancelled'],
            ],
        ],
    ])->plan();

    expect(collect($plan->queues)->pluck('name')->all())->toBe(['ecommerce.billing_dlq', 'ecommerce.billing'])
        ->and($plan->queues[1]->arguments())->toBe([
            'x-dead-letter-exchange' => '',
            'x-dead-letter-routing-key' => 'ecommerce.billing_dlq',
        ])
        ->and($plan->bindings)->toEqual([
            new BindingDefinition('ecommerce.billing', 'billing', 'invoice.issued'),
            new BindingDefinition('ecommerce.billing', 'billing', 'invoice.cancelled'),
        ]);
});

test('declares the dead letter queues before the queues that point to them', function () {
    $plan = plannerFor([
        'exchanges' => ['billing' => 'topic'],
        'internal_queues' => ['default'],
        'consumer_queues' => ['ecommerce.billing' => [['exchange' => 'billing', 'routing_key' => '#']]],
    ])->plan();

    expect(collect($plan->queues)->pluck('name')->all())
        ->toBe(['default_dlq', 'ecommerce.billing_dlq', 'ecommerce.billing']);
});

test('derives the dead letter queue name from the queue driver failed routing key', function () {
    $plan = plannerFor(['internal_queues' => ['default']], failedRoutingKey: '%s.failed')->plan();

    expect($plan->queues[0]->name)->toBe('default.failed');
});

test('declares the configured exchanges with their types', function () {
    $plan = plannerFor(['exchanges' => ['orders' => 'topic', 'stock' => 'fanout']])->plan();

    expect(collect($plan->exchanges)->mapWithKeys(fn ($exchange) => [$exchange->name => $exchange->type])->all())
        ->toBe(['orders' => 'topic', 'stock' => 'fanout']);
});

test('rejects an invalid configuration', function (array $topology, string $failedExchange, string $message) {
    plannerFor($topology, $failedExchange)->plan();
})->throws(InvalidArgumentException::class)->with([
    'unknown exchange type' => [['exchanges' => ['orders' => 'inexistente']], '', 'Tipo de exchange inválido'],
    'binding to an undeclared exchange' => [
        ['consumer_queues' => ['fila' => [['exchange' => 'fantasma', 'routing_key' => '#']]]],
        '',
        'não está em messaging.topology.exchanges',
    ],
    'custom failed exchange' => [['internal_queues' => ['default']], 'dlx', 'exchange padrão'],
]);
