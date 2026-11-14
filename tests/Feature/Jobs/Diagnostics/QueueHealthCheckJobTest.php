<?php

use App\Jobs\Diagnostics\QueueHealthCheckJob;
use Illuminate\Support\Facades\Log;

test('logs that the job was processed', function () {
    Log::spy();

    (new QueueHealthCheckJob)->handle();

    Log::shouldHaveReceived('info')->once()->with(QueueHealthCheckJob::LOG_MESSAGE);
});
