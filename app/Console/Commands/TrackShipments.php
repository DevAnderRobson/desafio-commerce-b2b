<?php

namespace App\Console\Commands;

use App\Orders\ShipmentTracker;
use Illuminate\Console\Command;

class TrackShipments extends Command
{
    protected $signature = 'orders:track';

    protected $description = 'Registra o próximo evento de rastreamento dos pedidos enviados (simulação da transportadora); a entrega fecha o pedido como entregue';

    public function handle(ShipmentTracker $tracker): int
    {
        $this->info($tracker->advanceDue().' evento(s) de rastreamento registrado(s).');

        return self::SUCCESS;
    }
}
