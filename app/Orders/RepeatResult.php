<?php

namespace App\Orders;

final readonly class RepeatResult
{
    /**
     * @param  list<string>  $adjusted  product names added with a smaller quantity than the original
     * @param  list<string>  $skipped  product names that could not be added
     */
    public function __construct(
        public int $added,
        public array $adjusted,
        public array $skipped,
    ) {}
}
