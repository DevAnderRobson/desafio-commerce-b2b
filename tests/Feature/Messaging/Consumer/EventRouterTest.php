<?php

use App\Messaging\Consumer\EventRouter;
use Tests\Fixtures\Messaging\RecordingEventHandler;

function routerFor(array $handlers): EventRouter
{
    return new EventRouter(['ecommerce.deliveries' => ['exchange' => 'deliveries', 'handlers' => $handlers]]);
}

test('routes an event to the handler configured for its exact name', function () {
    $router = routerFor(['delivery.status_updated' => RecordingEventHandler::class]);

    expect($router->handlerFor('ecommerce.deliveries', 'delivery.status_updated'))->toBe(RecordingEventHandler::class)
        ->and($router->queues())->toBe(['ecommerce.deliveries']);
});

test('has no handler for an unconfigured event or queue', function () {
    $router = routerFor(['delivery.status_updated' => RecordingEventHandler::class]);

    expect($router->handlerFor('ecommerce.deliveries', 'delivery.route_updated'))->toBeNull()
        ->and($router->handlerFor('outra.fila', 'delivery.status_updated'))->toBeNull();
});

test('rejects a configured handler that is not an event handler', function () {
    $router = routerFor(['delivery.status_updated' => stdClass::class]);

    expect(fn () => $router->assertValid('ecommerce.deliveries'))->toThrow(InvalidArgumentException::class, 'não existe ou não implementa')
        ->and(fn () => $router->handlerFor('ecommerce.deliveries', 'delivery.status_updated'))->toThrow(InvalidArgumentException::class);
});

test('accepts a queue whose handlers are all valid', function () {
    routerFor(['delivery.status_updated' => RecordingEventHandler::class])->assertValid('ecommerce.deliveries');

    expect(true)->toBeTrue();
});
