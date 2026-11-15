<?php

namespace Database\Factories;

use App\Enums\NewsletterStatus;
use App\Models\NewsletterSubscription;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<NewsletterSubscription>
 */
class NewsletterSubscriptionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'email' => fake()->unique()->safeEmail(),
            'status' => NewsletterStatus::Pending,
            'consented_at' => now(),
            'confirmation_sent_at' => now(),
            'confirmed_at' => null,
            'unsubscribed_at' => null,
        ];
    }

    public function confirmed(): static
    {
        return $this->state(['status' => NewsletterStatus::Confirmed, 'confirmed_at' => now()]);
    }

    public function unsubscribed(): static
    {
        return $this->state(['status' => NewsletterStatus::Unsubscribed, 'unsubscribed_at' => now()]);
    }
}
