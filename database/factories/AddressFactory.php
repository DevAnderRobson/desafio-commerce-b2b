<?php

namespace Database\Factories;

use App\Models\Address;
use App\Models\Customer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Address>
 */
class AddressFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'customer_id' => Customer::factory(),
            'label' => fake()->optional()->word(),
            'cep' => fake()->numerify('########'),
            'street' => fake()->streetName(),
            'number' => fake()->buildingNumber(),
            'complement' => null,
            'neighborhood' => fake()->word(),
            'city' => fake()->city(),
            'state' => 'PR',
            'last_used_at' => null,
        ];
    }

    public function inState(string $state): static
    {
        return $this->state(['state' => $state]);
    }

    public function lastUsed(string $when): static
    {
        return $this->state(['last_used_at' => $when]);
    }
}
