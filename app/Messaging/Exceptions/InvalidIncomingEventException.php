<?php

namespace App\Messaging\Exceptions;

use RuntimeException;

/**
 * A mensagem recebida não é um evento de integração válido.
 *
 * Não adianta tentar de novo: a mensagem vai para a Dead Letter Queue da fila.
 */
final class InvalidIncomingEventException extends RuntimeException
{
    public static function malformedJson(): self
    {
        return new self('O corpo da mensagem não é um JSON válido.');
    }

    /**
     * @param  list<string>  $errors
     */
    public static function invalidEnvelope(array $errors): self
    {
        return new self('Envelope inválido: '.implode(' ', $errors));
    }
}
