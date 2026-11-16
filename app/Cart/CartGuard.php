<?php

namespace App\Cart;

use App\Models\Product;
use App\Models\User;
use App\Pricing\PriceAvailability;
use App\Pricing\PriceResolver;
use Illuminate\Validation\ValidationException;

/**
 * Rules for holding a product in a cart: approved company, active product, available in the
 * customer's price table and enough stock. Carts do not reserve stock (only orders do).
 */
class CartGuard
{
    public function __construct(private PriceResolver $prices) {}

    /**
     * @throws ValidationException
     */
    public function assertCanHold(User $user, Product $product, int $quantity): void
    {
        $customer = $user->customer;

        if ($customer === null || ! $customer->isApproved()) {
            throw ValidationException::withMessages(['quantity' => 'O carrinho fica disponível após a aprovação do cadastro da sua empresa.']);
        }

        if (! $product->is_active) {
            throw ValidationException::withMessages(['quantity' => 'Este produto não está mais disponível.']);
        }

        if ($this->prices->resolve($customer, $product)->availability !== PriceAvailability::Available) {
            throw ValidationException::withMessages(['quantity' => 'Este produto não está disponível para o seu modelo de compra.']);
        }

        $available = $product->stock?->availableQuantity() ?? 0;

        if ($available <= 0) {
            throw ValidationException::withMessages(['quantity' => 'Produto sem estoque no momento.']);
        }

        if ($quantity > $available) {
            throw ValidationException::withMessages(['quantity' => "Temos apenas {$available} unidade(s) em estoque."]);
        }
    }
}
