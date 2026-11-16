<?php

namespace App\Orders;

use App\Models\Customer;
use App\Models\PaymentTerm;
use App\Support\Brl;

/**
 * Evaluates every payment term for a cart (D31): the minimum amount is compared to the subtotal
 * (goods only, with wholesale and promotion), the surcharge applies to subtotal + freight
 * (half-up in cents) and deferred terms need `credit limit - credit used >= total` (D21).
 */
class PaymentTermOptions
{
    /**
     * @return list<PaymentTermOption>
     */
    public function for(Customer $customer, int $subtotalCents, int $shippingCents): array
    {
        $availableCredit = $customer->availableCreditCents();

        return array_values(PaymentTerm::query()
            ->orderBy('minimum_amount_cents')
            ->orderBy('id')
            ->get()
            ->map(fn (PaymentTerm $term): PaymentTermOption => $this->evaluate($term, $subtotalCents, $shippingCents, $availableCredit))
            ->all());
    }

    public function find(Customer $customer, string $code, int $subtotalCents, int $shippingCents): ?PaymentTermOption
    {
        foreach ($this->for($customer, $subtotalCents, $shippingCents) as $option) {
            if ($option->term->code === $code) {
                return $option;
            }
        }

        return null;
    }

    public function surchargeCents(PaymentTerm $term, int $subtotalCents, int $shippingCents): int
    {
        $basisPoints = (int) round((float) $term->surcharge_percent * 100);

        return intdiv(($subtotalCents + $shippingCents) * $basisPoints + 5_000, 10_000);
    }

    private function evaluate(PaymentTerm $term, int $subtotalCents, int $shippingCents, int $availableCredit): PaymentTermOption
    {
        $surcharge = $this->surchargeCents($term, $subtotalCents, $shippingCents);
        $total = $subtotalCents + $shippingCents + $surcharge;
        $reason = null;

        if ($subtotalCents < $term->minimum_amount_cents) {
            $reason = 'Disponível para pedidos a partir de '.Brl::format($term->minimum_amount_cents).' em produtos (seu subtotal é '.Brl::format($subtotalCents).').';
        } elseif ($term->is_deferred && $total > $availableCredit) {
            $reason = 'Limite de crédito insuficiente. Disponível: '.Brl::format($availableCredit).'. Escolha PIX ou reduza o pedido.';
        }

        return new PaymentTermOption(
            term: $term,
            surchargeCents: $surcharge,
            totalCents: $total,
            available: $reason === null,
            unavailableReason: $reason,
            availableCreditCents: $term->is_deferred ? $availableCredit : null,
        );
    }
}
