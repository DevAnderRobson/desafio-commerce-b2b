<?php

namespace App\Cart;

enum CartItemIssue: string
{
    case Inactive = 'inactive';
    case UnavailableForModel = 'unavailable_for_model';
    case OutOfStock = 'out_of_stock';
    case InsufficientStock = 'insufficient_stock';

    public function message(int $available = 0): string
    {
        return match ($this) {
            self::Inactive => 'Este produto não está mais disponível. Remova-o para continuar.',
            self::UnavailableForModel => 'Este produto não está disponível para o seu modelo de compra. Remova-o para continuar.',
            self::OutOfStock => 'Produto sem estoque no momento. Remova-o para continuar.',
            self::InsufficientStock => "Temos apenas {$available} unidade(s) em estoque. Ajuste a quantidade.",
        };
    }
}
