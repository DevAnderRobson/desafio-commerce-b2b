<?php

namespace App\Providers;

use App\Messaging\Contracts\EventPublisher;
use App\Messaging\Contracts\EventTransport;
use App\Messaging\QueuedEventPublisher;
use App\Messaging\RabbitMq\RabbitMqEventTransport;
use Illuminate\Support\ServiceProvider;

class MessagingServiceProvider extends ServiceProvider
{
    /**
     * Vínculos do módulo de mensageria (pub/sub entre sistemas).
     *
     * @var array<class-string, class-string>
     */
    public array $bindings = [
        EventPublisher::class => QueuedEventPublisher::class,
        EventTransport::class => RabbitMqEventTransport::class,
    ];
}
