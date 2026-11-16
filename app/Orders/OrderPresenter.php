<?php

namespace App\Orders;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Support\Str;

/**
 * Props of the order tracking and confirmation screens (contract: resources/js/types/order.ts).
 */
class OrderPresenter
{
    public function __construct(private PaymentTermOptions $terms) {}

    /**
     * @return array<string, mixed>
     */
    public function tracking(Order $order): array
    {
        $order->loadMissing(['items.product.images', 'customer']);
        $canRetry = $order->status->canRetryPayment();

        return [
            'number' => $order->number,
            'status' => $order->status->value,
            'statusLabel' => $order->status->label(),
            'isPaymentFinal' => $order->status->isPaymentFinal(),
            'outcome' => $this->outcome($order->status),
            'createdAt' => $order->created_at?->toIso8601String(),
            'items' => array_values($order->items->map(fn (OrderItem $item): array => [
                'id' => $item->id,
                'name' => $item->product_name ?? $item->product->name,
                'href' => '/produtos/'.$item->product->slug,
                'imageUrl' => ($image = $item->product->images->first()) !== null ? asset($image->path) : null,
                'imageAlt' => $image !== null ? $image->alt : ($item->product_name ?? $item->product->name),
                'quantity' => $item->quantity,
                'unitPriceCents' => $item->unit_price_cents,
                'lineTotalCents' => $item->line_total_cents,
            ])->all()),
            'totals' => [
                'subtotalCents' => $order->subtotal_cents,
                'savingsCents' => $order->savings_cents,
                'shippingCents' => $order->shipping_cents,
                'surchargeCents' => $order->surcharge_cents,
                'totalCents' => $order->total_cents,
            ],
            'address' => $order->address_snapshot,
            'paymentTerm' => ['code' => (string) $order->payment_term_code, 'label' => (string) $order->payment_term_label],
            'steps' => $this->steps($order->status),
            'canRetryPayment' => $canRetry,
            'retryTerms' => $canRetry
                ? array_map(fn (PaymentTermOption $option): array => $option->toArray(), $this->terms->for($order->customer, $order->subtotal_cents, $order->shipping_cents))
                : [],
        ];
    }

    public function newAttemptKey(): string
    {
        return 'retry-'.Str::uuid();
    }

    private function outcome(OrderStatus $status): string
    {
        return match ($status) {
            OrderStatus::PendingPayment => 'processing',
            OrderStatus::Paid, OrderStatus::Picking, OrderStatus::Shipped, OrderStatus::Delivered => 'paid',
            OrderStatus::PaymentRefused => 'refused',
            OrderStatus::PaymentFailed => 'failed',
            OrderStatus::Expired => 'expired',
            OrderStatus::Cancelled => 'cancelled',
        };
    }

    /**
     * @return list<array{key: string, label: string, state: string}>
     */
    private function steps(OrderStatus $status): array
    {
        $paid = $this->outcome($status) === 'paid';
        $failed = in_array($status, [OrderStatus::PaymentRefused, OrderStatus::PaymentFailed, OrderStatus::Expired, OrderStatus::Cancelled], true);

        return [
            ['key' => 'received', 'label' => 'Pedido recebido', 'state' => 'done'],
            ['key' => 'payment', 'label' => 'Pagamento', 'state' => $paid ? 'done' : ($failed ? 'failed' : 'current')],
            ['key' => 'confirmed', 'label' => 'Pedido confirmado', 'state' => $paid ? 'done' : 'pending'],
        ];
    }
}
