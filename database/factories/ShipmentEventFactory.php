<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\ShipmentEvent;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ShipmentEvent>
 */
class ShipmentEventFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'code' => 'in_transit',
            'title' => 'Em trânsito',
            'description' => fake()->sentence(),
            'city' => fake()->city(),
            'state' => 'PR',
            'occurred_at' => now(),
        ];
    }
}
