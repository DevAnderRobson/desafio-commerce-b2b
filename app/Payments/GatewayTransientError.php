<?php

namespace App\Payments;

use RuntimeException;

/**
 * Temporary gateway failure (timeout, 5xx): the job retries with backoff.
 */
class GatewayTransientError extends RuntimeException {}
