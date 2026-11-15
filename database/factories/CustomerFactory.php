<?php

namespace Database\Factories;

use App\Enums\ApprovalStatus;
use App\Models\Customer;
use App\Models\PriceTable;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Customer>
 */
class CustomerFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'cnpj' => fake()->unique()->numerify('##.###.###/0001-##'),
            'legal_name' => fake()->company().' Ltda',
            'trade_name' => fake()->company(),
            'city' => fake()->city(),
            'state' => 'PR',
            'price_table_id' => PriceTable::factory(),
            'credit_limit_cents' => 1_000_000,
            'credit_used_cents' => 0,
            'is_blocked' => false,
            'approval_status' => ApprovalStatus::Approved,
            'approved_at' => now(),
            'duplicate_of_customer_id' => null,
        ];
    }

    public function pending(): static
    {
        return $this->state(['approval_status' => ApprovalStatus::Pending, 'approved_at' => null]);
    }

    public function rejected(): static
    {
        return $this->state(['approval_status' => ApprovalStatus::Rejected, 'approved_at' => null]);
    }

    public function blocked(): static
    {
        return $this->state(['is_blocked' => true]);
    }
}
