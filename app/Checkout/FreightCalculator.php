<?php

namespace App\Checkout;

use App\Models\Address;

interface FreightCalculator
{
    /**
     * Shipping options for the given goods subtotal (cents, already with wholesale and promotion)
     * and unit count, delivered to the address.
     *
     * @return list<FreightOption>
     *
     * @throws FreightUnavailable when the address cannot be served or the service is down
     */
    public function options(Address $address, int $subtotalCents, int $unitCount): array;

    /**
     * How much is missing for free shipping, or null when it is already free or there is no rule.
     */
    public function freeShippingMissingCents(int $subtotalCents): ?int;
}
