<?php

namespace App\Messaging\Contracts;

/**
 * Evento de integração: o contrato publicado para outros sistemas.
 *
 * Não confundir com os eventos internos do Laravel. Mudar a exchange, a routing
 * key ou a forma de `data()` altera o contrato com quem consome, por isso toda
 * mudança incompatível deve incrementar `version()`.
 */
interface PublishableEvent
{
    /**
     * Exchange (do tipo topic) para a qual o evento é publicado.
     */
    public function exchange(): string;

    /**
     * Routing key no formato `entity.action` (ex.: `order.created`).
     */
    public function routingKey(): string;

    /**
     * Versão do contrato dos dados.
     */
    public function version(): int;

    /**
     * Dados do evento. Devem ser serializáveis em JSON.
     *
     * @return array<string, mixed>
     */
    public function data(): array;
}
