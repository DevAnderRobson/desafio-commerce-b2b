<?php

namespace App\Messaging\Consumer;

/**
 * O que fazer com uma mensagem recebida do broker.
 */
enum Disposition
{
    /** Tratada (ou agendada): confirmar (`ack`) e remover da fila. */
    case Ack;

    /** Inválida ou sem handler: rejeitar sem requeue, rumo à Dead Letter Queue. */
    case DeadLetter;

    /** Falha inesperada e possivelmente transitória: devolver à fila para uma nova tentativa. */
    case Requeue;
}
