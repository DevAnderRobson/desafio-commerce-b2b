<?php

namespace App\Payments;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Str;

/**
 * Demo gateway (D12). The result is configured in `config/shop.php` (`SHOP_PAYMENT_OUTCOME`):
 * `approved`, `refused`, `transient` (always fails temporarily, so the order ends as failed)
 * or `flaky` (fails temporarily on the first two attempts, then approves). `delay_seconds`
 * makes the processing screen visible during a demo.
 */
class SimulatedPaymentGateway implements PaymentGateway
{
    public function charge(Order $order, Payment $payment): GatewayResult
    {
        $delay = (int) config('shop.payment.delay_seconds');

        if ($delay > 0) {
            sleep($delay);
        }

        $reference = 'SIM-'.strtoupper(Str::random(10));

        return match ((string) config('shop.payment.outcome')) {
            'refused' => new GatewayResult(GatewayOutcome::Refused, $reference, 'Pagamento recusado pela operadora (simulado).'),
            'transient' => throw new GatewayTransientError('Gateway indisponível (simulado).'),
            'flaky' => $payment->attempts < 3
                ? throw new GatewayTransientError('Gateway instável (simulado).')
                : new GatewayResult(GatewayOutcome::Approved, $reference),
            default => new GatewayResult(GatewayOutcome::Approved, $reference),
        };
    }
}
