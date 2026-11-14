<?php

namespace App\Messaging\RabbitMq;

use App\Messaging\Consumer\Disposition;
use App\Messaging\Consumer\IncomingMessageProcessor;
use App\Messaging\Exceptions\ConsumerException;
use App\Messaging\Support\MessagingLog;
use Exception;
use Illuminate\Container\Attributes\Config;
use PhpAmqpLib\Channel\AMQPChannel;
use PhpAmqpLib\Connection\AbstractConnection;
use PhpAmqpLib\Exception\AMQPExceptionInterface;
use PhpAmqpLib\Exception\AMQPProtocolChannelException;
use PhpAmqpLib\Exception\AMQPTimeoutException;
use PhpAmqpLib\Message\AMQPMessage;
use Throwable;

/**
 * Laço de consumo de uma fila do RabbitMQ (php-amqplib).
 *
 * Mantém uma conexão aberta, com heartbeat. Cada mensagem passa pelo
 * `IncomingMessageProcessor` e só é confirmada depois de decidida:
 *   - Ack:        confirmada;
 *   - DeadLetter: rejeitada sem requeue, vai para `<fila>_dlq`;
 *   - falha inesperada ao processar: volta à fila uma vez (pode ser transitória)
 *     e, se já era uma reentrega, vai para a DLQ, para nunca entrar em loop.
 *
 * Encerramento: SIGTERM/SIGINT fazem o laço terminar após a mensagem em curso, e
 * as mensagens ainda sem confirmação voltam à fila ao fechar o canal. Limites
 * (`maxMessages`, `maxSeconds`, `stopWhenEmpty`) permitem reciclar o processo e
 * testar. Falha de conexão encerra com `ConsumerException`; o supervisor reinicia.
 *
 * Conexão e canal são sempre fechados, mesmo em caso de erro.
 */
final class RabbitMqEventConsumer
{
    private bool $stopRequested = false;

    /**
     * @param  array{heartbeat?: int, read_write_timeout?: float}  $connectionOptions
     */
    public function __construct(
        private readonly RabbitMqConnectionFactory $connections,
        private readonly IncomingMessageProcessor $processor,
        #[Config('messaging.consumer.prefetch')] private readonly int $prefetch,
        #[Config('messaging.consumer.wait_timeout')] private readonly int $waitTimeout,
        #[Config('messaging.consumer.connection')] private readonly array $connectionOptions,
    ) {}

    /**
     * Consome a fila até um limite ser atingido ou um sinal de encerramento chegar.
     *
     * @return int quantidade de mensagens tratadas
     *
     * @throws ConsumerException|Exception
     */
    public function consume(string $queue, ?int $maxMessages = null, ?int $maxSeconds = null, bool $stopWhenEmpty = false): int
    {
        $this->stopRequested = false;
        $this->listenForStopSignals();

        $connection = null;
        $channel = null;
        $handled = 0;

        MessagingLog::consumer()->info('Consumidor iniciado.', ['queue' => $queue, 'prefetch' => $this->prefetch]);

        try {
            $connection = $this->connections->open($this->connectionOptions);
            $channel = $connection->channel();
            $channel->basic_qos(0, $this->prefetch, false);

            $channel->basic_consume($queue, '', false, false, false, false, function (AMQPMessage $message) use ($queue, &$handled): void {
                $this->settle($queue, $message);
                $handled++;
            });

            $startedAt = time();

            while ($channel->is_consuming() && ! $this->shouldStop($handled, $maxMessages, $startedAt, $maxSeconds)) {
                try {
                    $channel->wait(null, false, $this->waitTimeout);
                } catch (AMQPTimeoutException) {
                    if ($stopWhenEmpty) {
                        break;
                    }
                }
            }
        } catch (AMQPProtocolChannelException $exception) {
            throw $exception->getCode() === 404
                ? ConsumerException::queueNotFound($queue, $exception)
                : ConsumerException::unreachable($queue, $exception);
        } catch (AMQPExceptionInterface $exception) {
            throw ConsumerException::unreachable($queue, $exception);
        } finally {
            $this->closeQuietly($channel, $connection);
            $this->restoreStopSignals();

            MessagingLog::consumer()->info('Consumidor encerrado.', ['queue' => $queue, 'handled' => $handled]);
        }

        return $handled;
    }

    /**
     * Decide e aplica o destino da mensagem.
     */
    private function settle(string $queue, AMQPMessage $message): void
    {
        try {
            $disposition = $this->processor->process($queue, $message->getBody());
        } catch (Throwable $exception) {
            $disposition = $message->isRedelivered() ? Disposition::DeadLetter : Disposition::Requeue;

            MessagingLog::consumer()->error('Falha inesperada ao processar a mensagem.', [
                'queue' => $queue,
                'disposition' => $disposition->name,
                'error' => $exception->getMessage(),
            ]);
        }

        match ($disposition) {
            Disposition::Ack => $message->ack(),
            Disposition::DeadLetter => $message->reject(false),
            Disposition::Requeue => $message->reject(true),
        };
    }

    private function shouldStop(int $handled, ?int $maxMessages, int $startedAt, ?int $maxSeconds): bool
    {
        return $this->stopRequested
            || ($maxMessages !== null && $handled >= $maxMessages)
            || ($maxSeconds !== null && time() - $startedAt >= $maxSeconds);
    }

    private function listenForStopSignals(): void
    {
        if (! function_exists('pcntl_signal')) {
            return;
        }

        pcntl_async_signals(true);

        $stop = function (): void {
            $this->stopRequested = true;
        };

        pcntl_signal(SIGTERM, $stop);
        pcntl_signal(SIGINT, $stop);
    }

    private function restoreStopSignals(): void
    {
        if (! function_exists('pcntl_signal')) {
            return;
        }

        pcntl_signal(SIGTERM, SIG_DFL);
        pcntl_signal(SIGINT, SIG_DFL);
    }

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
