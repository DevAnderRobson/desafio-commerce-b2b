<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\Promotion;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Promotion>
 */
class PromotionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'discount_percent' => 10,
            'starts_on' => now()->subDays(7)->toDateString(),
            'ends_on' => now()->addDays(7)->toDateString(),
            'is_demo' => false,
        ];
    }

    public function percent(float $percent): static
    {
        return $this->state(['discount_percent' => $percent]);
    }

    public function between(string $startsOn, string $endsOn): static
    {
        return $this->state(['starts_on' => $startsOn, 'ends_on' => $endsOn]);
    }
}
