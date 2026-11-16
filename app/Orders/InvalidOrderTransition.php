<?php

namespace App\Orders;

use App\Enums\OrderStatus;
use RuntimeException;

class InvalidOrderTransition extends RuntimeException
{
    public static function between(OrderStatus $from, OrderStatus $to): self
    {
        return new self("Transição de pedido inválida: {$from->value} → {$to->value}.");
    }
}
