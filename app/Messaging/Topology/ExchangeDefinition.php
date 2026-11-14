<?php

namespace App\Messaging\Topology;

final readonly class ExchangeDefinition
{
    public function __construct(
        public string $name,
        public string $type,
    ) {}
}
