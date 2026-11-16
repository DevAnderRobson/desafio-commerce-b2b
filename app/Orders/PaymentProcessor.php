<?php

namespace App\Orders;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Events\OrderUpdated;
use App\Mail\OrderConfirmedMail;
use App\Mail\PaymentNotCompletedMail;
use App\Messaging\Contracts\EventPublisher;
use App\Messaging\Events\OrderPaid;
use App\Models\Cart;
use App\Models\Order;
use App\Models\Payment;
use App\Payments\GatewayOutcome;
use App\Payments\GatewayResult;
use App\Payments\PaymentGateway;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

/**
 * Settles the payment of an order. Re-running it, or running it after the order was already
 * settled or expired, changes nothing (idempotent). Temporary gateway errors are not caught: the
 * job retries them; only `failPermanently` closes the order as failed.
 */
class PaymentProcessor
{
    public function __construct(
        private PaymentGateway $gateway,
        private OrderLifecycle $lifecycle,
        private Reservations $reservations,
        private EventPublisher $events,
    ) {}

    public function process(Order $order): void
    {
        $order->refresh();

        if ($order->status !== OrderStatus::PendingPayment) {
            return;
        }

        $payment = $this->pendingPayment($order);

        if ($payment === null) {
            return;
        }

        $payment->increment('attempts');
        OrderUpdated::dispatch($order, PaymentStatus::Pending, $payment->attempts);

        $result = $this->gateway->charge($order, $payment->refresh());

        $this->settle($order, $payment, $result);
    }

    /**
     * No more retries left: close the order as failed and give stock and credit back.
     */
    public function failPermanently(Order $order): void
    {
        $this->close($order, OrderStatus::PaymentFailed, PaymentStatus::Failed, null);
    }

    /**
     * The order waited too long for the payment.
     */
    public function expire(Order $order): void
    {
        $this->close($order, OrderStatus::Expired, PaymentStatus::Failed, null);
    }

    private function settle(Order $order, Payment $payment, GatewayResult $result): void
    {
        if ($result->outcome === GatewayOutcome::Refused) {
            $this->close($order, OrderStatus::PaymentRefused, PaymentStatus::Refused, $result);

            return;
        }

        DB::transaction(function () use ($order, $payment, $result): void {
            $locked = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== OrderStatus::PendingPayment) {
                return;
            }

            $payment->forceFill(['status' => PaymentStatus::Approved, 'external_reference' => $result->reference])->save();
            $this->lifecycle->transition($locked, OrderStatus::Paid);
            $this->reservations->consume($locked->refresh());
            Cart::query()->where('user_id', $locked->user_id)->first()?->items()->delete();
            $this->events->publish(new OrderPaid($locked->id, $locked->customer_id, $locked->total_cents));
            Mail::to($locked->user->email)->queue(new OrderConfirmedMail($locked));
        });
    }

    private function close(Order $order, OrderStatus $status, PaymentStatus $paymentStatus, ?GatewayResult $result): void
    {
        DB::transaction(function () use ($order, $status, $paymentStatus, $result): void {
            $locked = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== OrderStatus::PendingPayment) {
                return;
            }

            $this->pendingPayment($locked)?->forceFill([
                'status' => $paymentStatus,
                'external_reference' => $result?->reference,
                'payload' => $result?->reason !== null ? ['reason' => $result->reason] : null,
            ])->save();

            $this->lifecycle->transition($locked, $status);
            $this->reservations->release($locked->refresh());
            Mail::to($locked->user->email)->queue(new PaymentNotCompletedMail($locked));
        });
    }

    private function pendingPayment(Order $order): ?Payment
    {
        return $order->payments()->where('status', PaymentStatus::Pending)->latest('id')->first();
    }
}
