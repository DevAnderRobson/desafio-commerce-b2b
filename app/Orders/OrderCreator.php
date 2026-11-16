<?php

namespace App\Orders;

use App\Cart\CartLine;
use App\Cart\CartTotals;
use App\Checkout\FreightCalculator;
use App\Checkout\FreightOption;
use App\Checkout\FreightUnavailable;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Enums\ReservationState;
use App\Jobs\ProcessOrderPayment;
use App\Messaging\Contracts\EventPublisher;
use App\Messaging\Events\OrderCreated;
use App\Models\Address;
use App\Models\Order;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Turns the cart into an order, or reopens a refused one with another payment term. Everything
 * is recomputed on the server inside one transaction: prices, freight, surcharge, stock and
 * credit. The idempotency key makes a double click or a resend return the same order.
 */
class OrderCreator
{
    public function __construct(
        private CartTotals $totals,
        private FreightCalculator $freight,
        private PaymentTermOptions $terms,
        private Reservations $reservations,
        private OrderLifecycle $lifecycle,
        private EventPublisher $events,
    ) {}

    /**
     * @throws OrderCannotBePlaced
     */
    public function create(User $user, Address $address, string $freightCode, string $termCode, string $idempotencyKey): Order
    {
        $existing = Order::query()->where('idempotency_key', $idempotencyKey)->first();

        if ($existing !== null) {
            return $this->sameCompanyOrFail($existing, $user);
        }

        try {
            $order = DB::transaction(fn (): Order => $this->place($user, $address, $freightCode, $termCode, $idempotencyKey));
        } catch (UniqueConstraintViolationException) {
            return $this->sameCompanyOrFail(Order::query()->where('idempotency_key', $idempotencyKey)->firstOrFail(), $user);
        }

        $this->events->publish(new OrderCreated($order->id, $order->customer_id, $order->total_cents));
        ProcessOrderPayment::dispatch($order);

        return $order;
    }

    /**
     * New payment attempt for an order whose payment was refused, failed or expired.
     *
     * @throws OrderCannotBePlaced
     */
    public function retryPayment(User $user, Order $order, string $termCode, string $attemptKey): Order
    {
        $this->sameCompanyOrFail($order, $user);

        $retried = DB::transaction(function () use ($order, $termCode, $attemptKey): ?Order {
            $locked = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();

            if ($locked->payments()->where('payload->idempotency_key', $attemptKey)->exists()) {
                return null;
            }

            if (! $locked->status->canRetryPayment()) {
                throw new OrderCannotBePlaced('Este pedido não aceita uma nova tentativa de pagamento.');
            }

            $option = $this->terms->find($locked->customer, $termCode, $locked->subtotal_cents, $locked->shipping_cents)
                ?? throw new OrderCannotBePlaced('Escolha uma condição de pagamento válida.', OrderCannotBePlaced::FIELD_TERM);

            if (! $option->available) {
                throw new OrderCannotBePlaced((string) $option->unavailableReason, OrderCannotBePlaced::FIELD_TERM);
            }

            $locked->forceFill([
                'payment_term_code' => $option->term->code,
                'payment_term_label' => $option->term->description,
                'surcharge_percent' => $option->term->surcharge_percent,
                'is_deferred' => $option->term->is_deferred,
                'surcharge_cents' => $option->surchargeCents,
                'total_cents' => $option->totalCents,
                'reservation_state' => ReservationState::Released,
            ])->save();

            $this->lifecycle->transition($locked, OrderStatus::PendingPayment);
            $this->reservations->reserve($locked->refresh());
            $locked->payments()->create([
                'payment_term_code' => $option->term->code,
                'status' => PaymentStatus::Pending,
                'amount_cents' => $option->totalCents,
                'payload' => ['idempotency_key' => $attemptKey],
            ]);

            return $locked;
        });

        if ($retried !== null) {
            ProcessOrderPayment::dispatch($retried);
        }

        return $order->refresh();
    }

    private function place(User $user, Address $address, string $freightCode, string $termCode, string $idempotencyKey): Order
    {
        $customer = $user->customer;

        if ($customer === null || $user->cannot('checkout') || $address->customer_id !== $customer->id) {
            throw new OrderCannotBePlaced('Não foi possível finalizar o pedido para esta empresa.');
        }

        $summary = $this->totals->summarize($user);

        if ($summary->isEmpty()) {
            throw new OrderCannotBePlaced('Seu carrinho está vazio.');
        }

        if ($summary->hasIssues()) {
            throw new OrderCannotBePlaced('Há itens indisponíveis no carrinho. Volte ao carrinho para ajustá-los.');
        }

        $freight = $this->freightOption($address, $freightCode, $summary->subtotalCents, $summary->unitCount());
        $option = $this->terms->find($customer, $termCode, $summary->subtotalCents, $freight->priceCents)
            ?? throw new OrderCannotBePlaced('Escolha uma condição de pagamento válida.', OrderCannotBePlaced::FIELD_TERM);

        if (! $option->available) {
            throw new OrderCannotBePlaced((string) $option->unavailableReason, OrderCannotBePlaced::FIELD_TERM);
        }

        $order = Order::query()->create([
            'number' => $this->nextNumber(),
            'customer_id' => $customer->id,
            'user_id' => $user->id,
            'status' => OrderStatus::PendingPayment,
            'payment_term_code' => $option->term->code,
            'payment_term_label' => $option->term->description,
            'surcharge_percent' => $option->term->surcharge_percent,
            'is_deferred' => $option->term->is_deferred,
            'subtotal_cents' => $summary->subtotalCents,
            'savings_cents' => $summary->savingsCents,
            'shipping_cents' => $freight->priceCents,
            'surcharge_cents' => $option->surchargeCents,
            'total_cents' => $option->totalCents,
            'freight_code' => $freight->code,
            'freight_label' => $freight->label,
            'address_snapshot' => [
                'label' => $address->label,
                'cep' => $address->formattedCep(),
                'street' => $address->street,
                'number' => $address->number,
                'complement' => $address->complement,
                'neighborhood' => $address->neighborhood,
                'city' => $address->city,
                'state' => $address->state,
            ],
            'idempotency_key' => $idempotencyKey,
        ]);

        foreach ($summary->lines as $line) {
            $order->items()->create($this->itemData($line));
        }

        $this->reservations->reserve($order->refresh());
        $order->payments()->create([
            'payment_term_code' => $option->term->code,
            'status' => PaymentStatus::Pending,
            'amount_cents' => $option->totalCents,
            'payload' => ['idempotency_key' => $idempotencyKey],
        ]);

        return $order;
    }

    /**
     * @return array<string, mixed>
     */
    private function itemData(CartLine $line): array
    {
        $product = $line->item->product;

        return [
            'product_id' => $product->id,
            'product_name' => $product->name,
            'sku' => $product->sku,
            'quantity' => $line->item->quantity,
            'list_unit_price_cents' => $line->quote->listUnitPriceCents,
            'unit_price_cents' => $line->quote->unitPriceCents,
            'promotion_percent' => $line->quote->promotionPercent,
            'line_total_cents' => $line->totalCents(),
        ];
    }

    private function freightOption(Address $address, string $code, int $subtotalCents, int $unitCount): FreightOption
    {
        try {
            $options = $this->freight->options($address, $subtotalCents, $unitCount);
        } catch (FreightUnavailable) {
            throw new OrderCannotBePlaced('Não foi possível calcular o frete para este endereço. Volte à etapa de entrega.');
        }

        foreach ($options as $option) {
            if ($option->code === $code) {
                return $option;
            }
        }

        throw new OrderCannotBePlaced('A opção de frete escolhida não está mais disponível. Volte à etapa de entrega.');
    }

    private function sameCompanyOrFail(Order $order, User $user): Order
    {
        if ($order->customer_id !== $user->customer_id) {
            throw new OrderCannotBePlaced('Não foi possível finalizar o pedido.');
        }

        return $order;
    }

    private function nextNumber(): string
    {
        do {
            $number = 'PED-'.now()->format('ymd').'-'.Str::upper(Str::random(5));
        } while (Order::query()->where('number', $number)->exists());

        return $number;
    }
}
