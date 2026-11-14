<?php

use App\Jobs\Diagnostics\QueueFailureProbeJob;

test('always throws so the message is rejected by the worker', function () {
    (new QueueFailureProbeJob)->handle();
})->throws(Exception::class, QueueFailureProbeJob::FAILURE_MESSAGE);
