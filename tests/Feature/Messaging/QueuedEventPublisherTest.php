<?php

use App\Messaging\Contracts\EventPublisher;
use App\Messaging\Events\OrderCreated;
use App\Messaging\Jobs\PublishEventJob;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;

test('dispatches a publish job carrying the event envelope', function () {
    Queue::fake([PublishEventJob::class]);

    app(EventPublisher::class)->publish(new OrderCreated(orderId: 1, customerId: 2, totalInCents: 300));

    Queue::assertPushed(
        PublishEventJob::class,
        fn (PublishEventJob $job) => $job->envelope->exchange === 'orders'
            && $job->envelope->routingKey === 'order.created'
            && $job->envelope->data['order_id'] === 1,
    );
});

/*
 * O Queue::fake() não respeita afterCommit, então os testes de transação usam o
 * driver "database" real e contam as linhas da tabela `jobs`.
 */
test('only enqueues the job after the surrounding transaction commits', function () {
    config(['queue.default' => 'database']);

    DB::transaction(function () {
        app(EventPublisher::class)->publish(new OrderCreated(1, 2, 300));

        expect(DB::table('jobs')->count())->toBe(0);
    });

    expect(DB::table('jobs')->count())->toBe(1);
});

test('never enqueues the job when the transaction rolls back', function () {
    config(['queue.default' => 'database']);

    try {
        DB::transaction(function () {
            app(EventPublisher::class)->publish(new OrderCreated(1, 2, 300));

            throw new RuntimeException('rollback');
        });
    } catch (RuntimeException) {
    }

    expect(DB::table('jobs')->count())->toBe(0);
});
