<?php

namespace App\Checkout;

use Illuminate\Contracts\Session\Session;

/**
 * Address and freight option chosen in the delivery step, kept in the session so going back from
 * the payment step preserves them. The order (wave 7) reads it when it is created.
 */
class CheckoutSelection
{
    private const ADDRESS_KEY = 'checkout.address_id';

    private const FREIGHT_KEY = 'checkout.freight_code';

    public function __construct(private Session $session) {}

    public function addressId(): ?int
    {
        $id = $this->session->get(self::ADDRESS_KEY);

        return is_int($id) ? $id : null;
    }

    public function freightCode(): ?string
    {
        $code = $this->session->get(self::FREIGHT_KEY);

        return is_string($code) ? $code : null;
    }

    public function remember(?int $addressId, ?string $freightCode): void
    {
        $this->session->put(self::ADDRESS_KEY, $addressId);
        $this->session->put(self::FREIGHT_KEY, $freightCode);
    }

    public function forgetAddress(int $addressId): void
    {
        if ($this->addressId() === $addressId) {
            $this->session->forget([self::ADDRESS_KEY, self::FREIGHT_KEY]);
        }
    }
}
