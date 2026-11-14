<?php

use App\Jobs\Diagnostics\QueueFailureProbeJob;
use App\Jobs\Diagnostics\QueueHealthCheckJob;
use Illuminate\Support\Facades\Queue;

test('dispatches the health check job by default', function () {
    Queue::fake([QueueHealthCheckJob::class, QueueFailureProbeJob::class]);

    $this->artisan('queue:probe')->assertSuccessful();

    Queue::assertPushed(QueueHealthCheckJob::class, 1);
    Queue::assertNotPushed(QueueFailureProbeJob::class);
});

test('dispatches the failure probe job with the fail option', function () {
    Queue::fake([QueueHealthCheckJob::class, QueueFailureProbeJob::class]);

    $this->artisan('queue:probe', ['--fail' => true])->assertSuccessful();

    Queue::assertPushed(QueueFailureProbeJob::class, 1);
    Queue::assertNotPushed(QueueHealthCheckJob::class);
});

test('dispatches as many jobs as requested on the given connection and queue', function () {
    Queue::fake([QueueHealthCheckJob::class]);

    $this->artisan('queue:probe', ['--count' => 3, '--connection' => 'rabbitmq', '--queue' => 'probe'])
        ->assertSuccessful();

    Queue::assertPushed(
        QueueHealthCheckJob::class,
        fn (QueueHealthCheckJob $job) => $job->connection === 'rabbitmq' && $job->queue === 'probe',
    );
    Queue::assertPushed(QueueHealthCheckJob::class, 3);
});

test('rejects an invalid count without dispatching', function (string $count) {
    Queue::fake([QueueHealthCheckJob::class]);

    $this->artisan('queue:probe', ['--count' => $count])->assertFailed();

    Queue::assertNothingPushed();
})->with(['zero' => '0', 'negative' => '-1', 'above the limit' => '1001']);

test('is blocked in production unless forced', function () {
    Queue::fake([QueueHealthCheckJob::class]);
    $this->app['env'] = 'production';

    $this->artisan('queue:probe')->assertFailed();
    Queue::assertNothingPushed();

    $this->artisan('queue:probe', ['--force' => true])->assertSuccessful();
    Queue::assertPushed(QueueHealthCheckJob::class, 1);
});
