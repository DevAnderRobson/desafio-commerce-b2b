<?php

namespace App\Messaging\Contracts;

use App\Messaging\EventEnvelope;
use App\Messaging\Exceptions\EventPublishingException;

/**
 * Entrega física de um envelope ao broker, de forma síncrona.
 *
 * É a camada que o `PublishEventJob` usa. O código de negócio deve usar o
 * `EventPublisher`, nunca este contrato diretamente.
 */
interface EventTransport
{
    /**
     * @throws EventPublishingException quando o broker não confirma a entrega
     */
    public function send(EventEnvelope $envelope): void;
}
