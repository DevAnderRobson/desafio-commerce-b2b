<?php

namespace App\Http\Controllers;

use App\Http\Requests\PlaceOrderRequest;
use App\Models\Order;
use App\Orders\OrderCannotBePlaced;
use App\Orders\OrderCreator;
use App\Orders\OrderPresenter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    public function __construct(
        private OrderPresenter $presenter,
        private OrderCreator $creator,
    ) {}

    public function processing(Request $request, Order $order): Response|RedirectResponse
    {
        $this->authorizeOrder($request, $order);

        if ($order->status->isPaymentFinal()) {
            return to_route('orders.confirmation', $order->number);
        }

        return Inertia::render('orders/processing', [
            'order' => $this->presenter->tracking($order),
            'polling' => [
                'intervalsMs' => config('shop.payment.polling_intervals_ms'),
                'timeoutMinutes' => (int) config('shop.payment.tracking_timeout_minutes'),
            ],
            'routes' => [
                'self' => route('orders.processing', $order->number, false),
                'orders' => '/conta/pedidos',
                'home' => route('home', absolute: false),
            ],
        ]);
    }

    public function confirmation(Request $request, Order $order): Response|RedirectResponse
    {
        $this->authorizeOrder($request, $order);

        if (! $order->status->isPaymentFinal()) {
            return to_route('orders.processing', $order->number);
        }

        $tracking = $this->presenter->tracking($order);

        return Inertia::render('orders/confirmation', [
            'order' => $tracking,
            'routes' => [
                'retry' => route('orders.retry', $order->number, false),
                'orders' => '/conta/pedidos',
                'home' => route('home', absolute: false),
            ],
            'retryIdempotencyKey' => $tracking['canRetryPayment'] ? $this->presenter->newAttemptKey() : null,
        ]);
    }

    public function retry(PlaceOrderRequest $request, Order $order): RedirectResponse
    {
        $this->authorizeOrder($request, $order);

        try {
            $this->creator->retryPayment($request->user(), $order, $request->string('payment_term_code')->toString(), $request->string('idempotency_key')->toString());
        } catch (OrderCannotBePlaced $exception) {
            throw ValidationException::withMessages([$exception->field => $exception->getMessage()]);
        }

        return to_route('orders.processing', $order->number);
    }

    private function authorizeOrder(Request $request, Order $order): void
    {
        abort_unless($order->customer_id === $request->user()->customer_id, 403);
    }
}
