<?php

namespace App\Payments;

final readonly class GatewayResult
{
    public function __construct(
        public GatewayOutcome $outcome,
        public string $reference,
        public ?string $reason = null,
    ) {}
}
