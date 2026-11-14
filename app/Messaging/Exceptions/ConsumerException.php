<?php

namespace App\Messaging\Exceptions;

use RuntimeException;
use Throwable;

/**
 * Falha do consumidor ao falar com o broker.
 *
 * Encerra o comando com erro: em produção o supervisor reinicia o processo, que
 * reabre a conexão. Mensagens ainda sem confirmação voltam à fila e são
 * reentregues, e a idempotência evita tratá-las duas vezes.
 */
final class ConsumerException extends RuntimeException
{
    public static function unreachable(string $queue, Throwable $previous): self
    {
        return new self(
            sprintf('Falha de comunicação com o broker ao consumir a fila "%s": %s', $queue, $previous->getMessage()),
            previous: $previous,
        );
    }

    public static function queueNotFound(string $queue, Throwable $previous): self
    {
        return new self(
            sprintf('A fila "%s" não existe no broker. Rode `php artisan messaging:setup` primeiro. (%s)', $queue, $previous->getMessage()),
            previous: $previous,
        );
    }
}
