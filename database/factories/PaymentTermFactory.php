<?php

namespace Database\Factories;

use App\Models\PaymentTerm;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PaymentTerm>
 */
class PaymentTermFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => strtoupper(fake()->unique()->lexify('PAG????')),
            'description' => fake()->sentence(3),
            'minimum_amount_cents' => 0,
            'surcharge_percent' => 0,
            'is_deferred' => false,
        ];
    }
}
