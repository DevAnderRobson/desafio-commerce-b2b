<?php

namespace App\Checkout;

use Illuminate\Contracts\Session\Session;
use Illuminate\Support\Str;

/**
 * Address and freight option chosen in the delivery step, kept in the session so going back from
 * the payment step preserves them. The order (wave 7) reads it when it is created.
 */
class CheckoutSelection
{
    private const ADDRESS_KEY = 'checkout.address_id';

    private const FREIGHT_KEY = 'checkout.freight_code';

    private const KEY_KEY = 'checkout.idempotency_key';

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

    /**
     * Key sent with the order confirmation; the same key always yields the same order.
     */
    public function idempotencyKey(): string
    {
        $key = $this->session->get(self::KEY_KEY);

        if (! is_string($key)) {
            $key = 'ord-'.Str::uuid();
            $this->session->put(self::KEY_KEY, $key);
        }

        return $key;
    }

    /**
     * The order was placed: the next purchase starts with a fresh selection and key.
     */
    public function finish(): void
    {
        $this->session->forget([self::ADDRESS_KEY, self::FREIGHT_KEY, self::KEY_KEY]);
    }

    public function forgetAddress(int $addressId): void
    {
        if ($this->addressId() === $addressId) {
            $this->session->forget([self::ADDRESS_KEY, self::FREIGHT_KEY]);
        }
    }
}
