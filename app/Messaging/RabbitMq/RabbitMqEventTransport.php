<?php

namespace App\Messaging\RabbitMq;

use App\Messaging\Contracts\EventTransport;
use App\Messaging\EventEnvelope;
use App\Messaging\Exceptions\EventPublishingException;
use Illuminate\Container\Attributes\Config;
use PhpAmqpLib\Channel\AMQPChannel;
use PhpAmqpLib\Connection\AbstractConnection;
use PhpAmqpLib\Exception\AMQPExceptionInterface;
use PhpAmqpLib\Exception\AMQPProtocolChannelException;
use PhpAmqpLib\Exception\AMQPTimeoutException;
use PhpAmqpLib\Message\AMQPMessage;
use Throwable;

/**
 * Adapter RabbitMQ (php-amqplib) do `EventTransport`.
 *
 * Gestão de recursos: cada `send()` abre sua própria conexão e canal e os fecha
 * num `finally`, mesmo em caso de erro. Num worker de longa duração isso evita
 * conexões obsoletas ou vazadas entre jobs, ao custo de um handshake por
 * publicação, aceitável porque a publicação roda de dentro de um job.
 *
 * Garantias de entrega:
 *  - Publisher Confirms (`confirm_select`): só retorna com sucesso depois que o
 *    broker confirma (`basic.ack`).
 *  - `mandatory` + return listener: mensagem sem fila de destino (routing key
 *    sem binding) deixa de ser descartada em silêncio e vira exceção.
 *  - `basic.nack`, exchange inexistente, timeout e falha de conexão também
 *    viram `EventPublishingException`.
 *
 * Este adapter não declara exchanges: a topologia é responsabilidade do setup.
 */
final class RabbitMqEventTransport implements EventTransport
{
    public function __construct(
        private readonly RabbitMqConnectionFactory $connections,
        #[Config('messaging.publisher.confirm_timeout')] private readonly float $confirmTimeout,
        #[Config('app.name')] private readonly string $appId,
    ) {}

    public function send(EventEnvelope $envelope): void
    {
        $connection = null;
        $channel = null;

        try {
            $connection = $this->connections->open();
            $channel = $connection->channel();
            $channel->confirm_select();

            $outcome = new PublishOutcome;
            $channel->set_return_listener(function (int $replyCode, string $replyText) use ($outcome): void {
                $outcome->returnedReason = sprintf('%d %s', $replyCode, $replyText);
            });
            $channel->set_nack_handler(function () use ($outcome): void {
                $outcome->nacked = true;
            });

            $channel->basic_publish($this->message($envelope), $envelope->exchange, $envelope->routingKey, mandatory: true);
            $channel->wait_for_pending_acks_returns($this->confirmTimeout);

            if ($outcome->returnedReason !== null) {
                throw EventPublishingException::unroutable($envelope, $outcome->returnedReason);
            }

            if ($outcome->nacked) {
                throw EventPublishingException::nacked($envelope);
            }
        } catch (AMQPTimeoutException $exception) {
            throw EventPublishingException::confirmationTimeout($envelope, $exception);
        } catch (AMQPProtocolChannelException $exception) {
            throw EventPublishingException::rejectedByBroker($envelope, $exception);
        } catch (AMQPExceptionInterface $exception) {
            throw EventPublishingException::unreachable($envelope, $exception);
        } finally {
            $this->closeQuietly($channel, $connection);
        }
    }

    private function message(EventEnvelope $envelope): AMQPMessage
    {
        return new AMQPMessage($envelope->toJson(), [
            'content_type' => 'application/json',
            'content_encoding' => 'UTF-8',
            'delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT,
            'message_id' => $envelope->id,
            'type' => $envelope->routingKey,
            'timestamp' => now()->getTimestamp(),
            'app_id' => $this->appId,
        ]);
    }

    /**
     * Fecha canal e conexão sem mascarar a exceção original: um erro ao fechar
     * uma conexão que já caiu é esperado e não deve substituir a causa real.
     */
    private function closeQuietly(?AMQPChannel $channel, ?AbstractConnection $connection): void
    {
        try {
            $channel?->close();
        } catch (Throwable) {
        }

        try {
            $connection?->close();
        } catch (Throwable) {
        }
    }
}
