<?php

namespace App\Events;

use App\Enums\PaymentStatus;
use App\Models\Order;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Live update of an order and of its payment for the tracking screens (Reverb). Sent after every
 * order status change and every payment attempt. The payload only tells the browser that
 * something changed and the headline state; the screen then reloads the real data over HTTP, so
 * nothing sensitive travels through the socket.
 */
class OrderUpdated implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Order $order,
        public ?PaymentStatus $paymentStatus = null,
        public int $paymentAttempts = 0,
    ) {}

    /**
     * @return list<PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('orders.'.$this->order->number)];
    }

    public function broadcastAs(): string
    {
        return 'order.updated';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'number' => $this->order->number,
            'status' => $this->order->status->value,
            'statusLabel' => $this->order->status->label(),
            'isPaymentFinal' => $this->order->status->isPaymentFinal(),
            'payment' => $this->paymentStatus === null ? null : [
                'status' => $this->paymentStatus->value,
                'attempts' => $this->paymentAttempts,
            ],
        ];
    }
}
