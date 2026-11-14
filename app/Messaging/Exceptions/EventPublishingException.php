<?php

namespace App\Messaging\Exceptions;

use App\Messaging\EventEnvelope;
use App\Messaging\Support\MessagingLog;
use RuntimeException;
use Throwable;

/**
 * O broker não confirmou a entrega do evento.
 *
 * Lançada pelo transporte e propagada pelo `PublishEventJob`, o que aciona as
 * retentativas e, esgotadas, a Dead Letter Queue da fila de execução.
 *
 * É uma exceção "reportável" do Laravel: ao ser reportada (a cada tentativa
 * falha do worker), ela mesma registra o erro no canal `messaging_publisher` e
 * impede que o Laravel a duplique no log padrão.
 */
final class EventPublishingException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly EventEnvelope $envelope,
        ?Throwable $previous = null,
    ) {
        parent::__construct($message, previous: $previous);
    }

    /**
     * O broker aceitou a mensagem, mas nenhuma fila estava ligada à exchange
     * com essa routing key (`basic.return`).
     */
    public static function unroutable(EventEnvelope $envelope, string $reason): self
    {
        return new self(sprintf(
            'Evento %s [%s] sem destino na exchange "%s": %s.',
            $envelope->routingKey,
            $envelope->id,
            $envelope->exchange,
            $reason,
        ), $envelope);
    }

    /**
     * O broker recusou a mensagem (`basic.nack`).
     */
    public static function nacked(EventEnvelope $envelope): self
    {
        return new self(sprintf(
            'O broker recusou o evento %s [%s] na exchange "%s".',
            $envelope->routingKey,
            $envelope->id,
            $envelope->exchange,
        ), $envelope);
    }

    /**
     * O broker não respondeu dentro do tempo limite. A mensagem pode ou não ter
     * sido entregue, por isso o consumidor deve deduplicar pelo `id`.
     */
    public static function confirmationTimeout(EventEnvelope $envelope, Throwable $previous): self
    {
        return new self(sprintf(
            'Sem confirmação do broker para o evento %s [%s] dentro do tempo limite.',
            $envelope->routingKey,
            $envelope->id,
        ), $envelope, $previous);
    }

    /**
     * O broker encerrou o canal com erro, por exemplo exchange inexistente.
     */
    public static function rejectedByBroker(EventEnvelope $envelope, Throwable $previous): self
    {
        return new self(sprintf(
            'O broker rejeitou o evento %s [%s] na exchange "%s": %s',
            $envelope->routingKey,
            $envelope->id,
            $envelope->exchange,
            $previous->getMessage(),
        ), $envelope, $previous);
    }

    /**
     * Falha de conexão ou de comunicação com o broker.
     */
    public static function unreachable(EventEnvelope $envelope, Throwable $previous): self
    {
        return new self(sprintf(
            'Não foi possível comunicar com o broker para publicar o evento %s [%s]: %s',
            $envelope->routingKey,
            $envelope->id,
            $previous->getMessage(),
        ), $envelope, $previous);
    }

    /**
     * Registra a falha no canal de messaging. Retorna `true` para que o Laravel
     * não a reporte também no canal padrão.
     */
    public function report(): bool
    {
        MessagingLog::publisher()->error($this->getMessage(), [
            'event_id' => $this->envelope->id,
            'event' => $this->envelope->routingKey,
            'exchange' => $this->envelope->exchange,
            'cause' => $this->getPrevious()?->getMessage(),
        ]);

        return true;
    }
}
