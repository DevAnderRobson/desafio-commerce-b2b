<?php

namespace App\Catalog;

final class ImportReport
{
    /**
     * @param  array<string, int>  $counts
     * @param  list<string>  $warnings
     */
    public function __construct(
        public array $counts = [],
        public array $warnings = [],
    ) {}

    public function count(string $entity, int $amount): void
    {
        $this->counts[$entity] = ($this->counts[$entity] ?? 0) + $amount;
    }

    public function warn(string $message): void
    {
        $this->warnings[] = $message;
    }
}
