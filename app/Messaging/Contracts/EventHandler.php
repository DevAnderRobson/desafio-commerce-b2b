<?php

namespace App\Messaging\Contracts;

use App\Messaging\Consumer\IncomingEvent;

/**
 * Reage a um evento de integração recebido de outro sistema.
 *
 * O handler é associado a uma routing key em `messaging.consumers`, é resolvido
 * pelo container e roda dentro de um job na fila de execução, com retentativas.
 * Ele não conhece RabbitMQ.
 *
 * Roda numa transação de banco junto com o registro de idempotência: se lançar
 * exceção, o evento não fica marcado como tratado e a retentativa o executa de
 * novo. Efeitos fora do banco (HTTP, e-mail) devem ser idempotentes por si.
 */
interface EventHandler
{
    public function handle(IncomingEvent $event): void;
}
