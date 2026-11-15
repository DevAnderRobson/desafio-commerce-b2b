<?php

namespace App\Reviews;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;

/**
 * Decides the "bought this product" badge (D17, D33). The badge never comes from request input:
 * it requires a delivered order containing the product, placed by the reviewer or, when the
 * reviewer is the company owner, by anyone in the same company.
 */
class PurchaseVerifier
{
    public function hasDeliveredPurchase(User $user, Product $product): bool
    {
        return Order::query()
            ->where('status', OrderStatus::Delivered)
            ->whereNotNull('delivered_at')
            ->whereHas('items', fn ($items) => $items->where('product_id', $product->id))
            ->where(function ($orders) use ($user): void {
                $orders->where('user_id', $user->id);

                if ($user->customer_id !== null && $user->isCompanyOwner()) {
                    $orders->orWhere('customer_id', $user->customer_id);
                }
            })
            ->exists();
    }
}
