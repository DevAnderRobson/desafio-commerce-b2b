<?php

namespace App\Messaging\Exceptions;

use RuntimeException;
use Throwable;

/**
 * Falha ao aplicar a topologia no broker.
 */
final class TopologyException extends RuntimeException
{
    /**
     * O broker recusou a declaração. O caso típico é o conflito: o recurso já
     * existe com argumentos ou tipo diferentes, e o RabbitMQ não permite alterá-los.
     */
    public static function rejected(string $resource, Throwable $previous): self
    {
        return new self(
            sprintf(
                'O broker recusou "%s": %s. Se o recurso já existe com outros argumentos, apague-o no broker e rode o setup de novo.',
                $resource,
                $previous->getMessage(),
            ),
            previous: $previous,
        );
    }

    public static function unreachable(Throwable $previous): self
    {
        return new self(
            'Não foi possível comunicar com o broker: '.$previous->getMessage(),
            previous: $previous,
        );
    }
}
