<?php

namespace App\Enums;

/**
 * Where the stock and credit held by an order currently stand, so release/consume are idempotent.
 */
enum ReservationState: string
{
    case None = 'none';
    case Reserved = 'reserved';
    case Consumed = 'consumed';
    case Released = 'released';
}
