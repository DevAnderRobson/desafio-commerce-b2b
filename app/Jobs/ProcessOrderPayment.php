<?php

namespace App\Jobs;

use App\Models\Order;
use App\Orders\PaymentProcessor;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

/**
 * Charges the order through the gateway. Temporary errors retry with growing backoff; when the
 * retries run out the order is closed as failed and its stock and credit are released.
 */
class ProcessOrderPayment implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    public int $uniqueFor = 120;

    public function __construct(public Order $order) {}

    /**
     * @return list<int>
     */
    public function backoff(): array
    {
        return [2, 5, 10, 20];
    }

    public function uniqueId(): string
    {
        return (string) $this->order->id;
    }

    public function handle(PaymentProcessor $processor): void
    {
        $processor->process($this->order);
    }

    public function failed(?Throwable $exception): void
    {
        app(PaymentProcessor::class)->failPermanently($this->order);
    }
}
