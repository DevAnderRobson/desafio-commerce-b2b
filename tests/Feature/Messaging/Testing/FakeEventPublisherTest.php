<?php

use App\Messaging\Contracts\EventPublisher;
use App\Messaging\Events\OrderCreated;
use App\Messaging\Testing\FakeEventPublisher;
use PHPUnit\Framework\AssertionFailedError;

test('replaces the container binding so business code publishes into the fake', function () {
    $fake = FakeEventPublisher::fake();

    app(EventPublisher::class)->publish(new OrderCreated(1, 2, 300));

    $fake->assertPublished(OrderCreated::class, fn (OrderCreated $event) => $event->orderId === 1);
    $fake->assertPublishedTimes(OrderCreated::class, 1);
});

test('fails the assertions when the event was not published', function () {
    $fake = FakeEventPublisher::fake();

    expect(fn () => $fake->assertPublished(OrderCreated::class))->toThrow(AssertionFailedError::class);
    $fake->assertNotPublished(OrderCreated::class);
    $fake->assertNothingPublished();

    app(EventPublisher::class)->publish(new OrderCreated(1, 2, 300));

    expect(fn () => $fake->assertNotPublished(OrderCreated::class))->toThrow(AssertionFailedError::class)
        ->and(fn () => $fake->assertNothingPublished())->toThrow(AssertionFailedError::class);
});

test('only counts events that match the filter', function () {
    $fake = FakeEventPublisher::fake();

    app(EventPublisher::class)->publish(new OrderCreated(1, 2, 300));

    $fake->assertNotPublished(OrderCreated::class, fn (OrderCreated $event) => $event->orderId === 99);
});
