<?php

namespace App\Console\Commands;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Orders\InvalidOrderTransition;
use App\Orders\OrderLifecycle;
use Illuminate\Console\Command;

class AdvanceOrder extends Command
{
    protected $signature = 'orders:advance {order : Número do pedido (ex.: PED-261116-ABCDE)} {status : paid, picking, shipped ou delivered}';

    protected $description = 'Avança um pedido pelo ciclo pós-pagamento (uso de demonstração até existir a gestão da loja)';

    public function handle(OrderLifecycle $lifecycle): int
    {
        $order = Order::query()->where('number', $this->argument('order'))->first();
        $status = OrderStatus::tryFrom((string) $this->argument('status'));

        if ($order === null || $status === null) {
            $this->error('Pedido ou status desconhecido.');

            return self::FAILURE;
        }

        try {
            $order = $lifecycle->transition($order, $status);
        } catch (InvalidOrderTransition $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->info("Pedido {$order->number}: {$order->status->label()}.");

        return self::SUCCESS;
    }
}
