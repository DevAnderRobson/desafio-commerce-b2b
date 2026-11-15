<?php

namespace Database\Seeders;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use App\Reviews\PurchaseVerifier;
use Illuminate\Database\Seeder;

/**
 * Demo delivered orders and reviews so the product page shows both badges ("Comprou" and
 * "Ainda não comprou"). Runs after DemoUsersSeeder; deterministic and idempotent. The badge is
 * still computed by PurchaseVerifier, exactly as in production.
 */
class DemoReviewsSeeder extends Seeder
{
    private const int PRODUCTS_WITH_REVIEWS = 6;

    /** @var list<string> */
    private const array BODIES = [
        'Chegou dentro do prazo e bem embalado. Repetiremos o pedido.',
        'Produto conforme descrito, boa relação entre preço e qualidade.',
        'Atende bem à nossa rotina de reposição, sem problemas até agora.',
        'Embalagem chegou levemente amassada, mas o produto estava perfeito.',
    ];

    public function run(PurchaseVerifier $purchases): void
    {
        $buyers = User::query()->whereIn('email', ['dono1@example.com', 'dono2@example.com', 'membro1@example.com'])->orderBy('id')->get();

        if ($buyers->isEmpty()) {
            return;
        }

        $products = Product::query()->active()->orderBy('id')->limit(self::PRODUCTS_WITH_REVIEWS)->get();

        foreach ($products as $index => $product) {
            foreach ($buyers as $position => $buyer) {
                if ($buyer->customer_id === null) {
                    continue;
                }

                // Every other reviewer bought the product; the rest reviews without a delivered order.
                if (($index + $position) % 2 === 0) {
                    $this->deliveredOrder($buyer, $product, "DEMO-{$buyer->id}-{$product->id}");
                }

                Review::query()->updateOrCreate(
                    ['product_id' => $product->id, 'user_id' => $buyer->id],
                    [
                        'rating' => 3 + (($index + $position) % 3),
                        'title' => null,
                        'body' => self::BODIES[($index + $position) % count(self::BODIES)],
                        'verified_purchase' => $purchases->hasDeliveredPurchase($buyer, $product),
                    ],
                );
            }
        }
    }

    private function deliveredOrder(User $buyer, Product $product, string $number): void
    {
        $order = Order::query()->firstOrCreate(
            ['number' => $number],
            [
                'customer_id' => $buyer->customer_id,
                'user_id' => $buyer->id,
                'status' => OrderStatus::Delivered,
                'delivered_at' => now()->subDays(10),
            ],
        );

        OrderItem::query()->firstOrCreate(
            ['order_id' => $order->id, 'product_id' => $product->id],
            ['quantity' => 3, 'unit_price_cents' => 1000],
        );
    }
}
