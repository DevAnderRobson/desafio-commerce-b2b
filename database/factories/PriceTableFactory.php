<?php

namespace Database\Factories;

use App\Models\PriceTable;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PriceTable>
 */
class PriceTableFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => strtoupper(fake()->unique()->lexify('TAB????')),
            'description' => fake()->sentence(3),
        ];
    }

    public function standard(): static
    {
        return $this->state(['code' => 'PADRAO', 'description' => 'Tabela padrão']);
    }

    public function wholesale(): static
    {
        return $this->state(['code' => 'ATACADISTA', 'description' => 'Tabela atacadista']);
    }
}
