<?php

namespace App\Messaging\Contracts;

/**
 * Porta de entrada do código de negócio para anunciar eventos a outros sistemas.
 *
 * A implementação padrão não publica na hora: agenda a publicação numa fila
 * interna, somente após o commit da transação em andamento. O código de negócio
 * não conhece RabbitMQ.
 */
interface EventPublisher
{
    public function publish(PublishableEvent $event): void;
}
