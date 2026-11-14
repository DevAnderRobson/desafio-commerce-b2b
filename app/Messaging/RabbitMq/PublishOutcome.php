<?php

namespace App\Messaging\RabbitMq;

/**
 * Resultado de uma publicação, preenchido pelos callbacks do broker
 * (`basic.return` e `basic.nack`) enquanto se aguarda a confirmação.
 */
final class PublishOutcome
{
    /**
     * Motivo informado pelo broker quando a mensagem não tinha destino.
     */
    public ?string $returnedReason = null;

    public bool $nacked = false;
}
