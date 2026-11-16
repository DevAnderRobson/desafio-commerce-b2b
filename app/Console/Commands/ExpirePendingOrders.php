<?php

namespace App\Console\Commands;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Orders\PaymentProcessor;
use Illuminate\Console\Command;

class ExpirePendingOrders extends Command
{
    protected $signature = 'orders:expire {--minutes= : Idade mínima em minutos (padrão: config shop.payment.expire_minutes)}';

    protected $description = 'Expira pedidos aguardando pagamento há muito tempo, devolvendo estoque e limite de crédito reservados';

    public function handle(PaymentProcessor $processor): int
    {
        $minutes = $this->option('minutes');
        $threshold = is_numeric($minutes) ? (int) $minutes : (int) config('shop.payment.expire_minutes');
        $expired = 0;

        Order::query()
            ->where('status', OrderStatus::PendingPayment)
            ->where('created_at', '<=', now()->subMinutes($threshold))
            ->each(function (Order $order) use ($processor, &$expired): void {
                $processor->expire($order);
                $expired++;
            });

        $this->info("{$expired} pedido(s) expirado(s).");

        return self::SUCCESS;
    }
}
