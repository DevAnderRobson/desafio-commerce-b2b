<?php

namespace App\Models;

use App\Enums\NewsletterStatus;
use Database\Factories\NewsletterSubscriptionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $email
 * @property NewsletterStatus $status
 * @property Carbon $consented_at
 * @property Carbon|null $confirmation_sent_at
 * @property Carbon|null $confirmed_at
 * @property Carbon|null $unsubscribed_at
 */
#[Fillable(['email', 'status', 'consented_at', 'confirmation_sent_at', 'confirmed_at', 'unsubscribed_at'])]
class NewsletterSubscription extends Model
{
    /** @use HasFactory<NewsletterSubscriptionFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => NewsletterStatus::class,
            'consented_at' => 'datetime',
            'confirmation_sent_at' => 'datetime',
            'confirmed_at' => 'datetime',
            'unsubscribed_at' => 'datetime',
        ];
    }
}
