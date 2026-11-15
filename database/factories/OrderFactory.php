<?php

namespace Database\Factories;

use App\Enums\OrderStatus;
use App\Models\Customer;
use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'number' => 'PED-'.fake()->unique()->numerify('########'),
            'customer_id' => Customer::factory(),
            'user_id' => User::factory(),
            'status' => OrderStatus::PendingPayment,
            'delivered_at' => null,
        ];
    }

    public function delivered(): static
    {
        return $this->state(['status' => OrderStatus::Delivered, 'delivered_at' => now()->subDays(2)]);
    }

    public function withStatus(OrderStatus $status): static
    {
        return $this->state(['status' => $status]);
    }
}
