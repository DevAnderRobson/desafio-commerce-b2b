<?php

namespace App\Orders;

use RuntimeException;

/**
 * The order could not be created or re-opened; the message is safe to show to the customer.
 */
class OrderCannotBePlaced extends RuntimeException
{
    public const string FIELD_ORDER = 'order';

    public const string FIELD_TERM = 'payment_term_code';

    public function __construct(string $message, public readonly string $field = self::FIELD_ORDER)
    {
        parent::__construct($message);
    }
}
