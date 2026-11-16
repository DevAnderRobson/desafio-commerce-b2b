<?php

namespace Database\Factories;

use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'payment_term_code' => 'PIX',
            'status' => PaymentStatus::Pending,
            'attempts' => 0,
            'amount_cents' => 1000,
        ];
    }
}
