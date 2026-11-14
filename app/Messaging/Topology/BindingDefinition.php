<?php

namespace App\Messaging\Topology;

final readonly class BindingDefinition
{
    public function __construct(
        public string $queue,
        public string $exchange,
        public string $routingKey,
    ) {}
}
