<?php

namespace App\Pricing;

enum PriceAvailability: string
{
    /** Visitor or customer not approved yet: prices must not be exposed. */
    case Hidden = 'hidden';

    /** Product is not sold under the customer's price table (Padrão/Atacadista). */
    case UnavailableForTable = 'unavailable_for_table';

    case Available = 'available';
}
