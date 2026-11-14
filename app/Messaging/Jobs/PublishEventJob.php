<?php

namespace App\Messaging\Jobs;

use App\Messaging\Contracts\EventTransport;
use App\Messaging\EventEnvelope;
use App\Messaging\Exceptions\EventPublishingException;
use App\Messaging\Support\MessagingLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Throwable;

/**
 * Publica um evento de integração no broker, a partir da fila de execução.
 *
 * Implementa `ShouldQueueAfterCommit`: dentro de uma transação, o job só é
 * enfileirado após o commit e é descartado em caso de rollback.
 *
 * Retentativas podem repetir a publicação (ex.: timeout de confirmação com a
 * mensagem já entregue). O `id` do envelope é estável, então o consumidor deve
 * ignorar duplicatas por ele.
 *
 * Logs (canal `messaging_publisher`): sucesso a cada publicação, cada tentativa
 * falha (via `EventPublishingException::report()`) e o esgotamento das tentativas.
 */
class PublishEventJob implements ShouldQueueAfterCommit
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public int $tries = 5;

    public function __construct(public readonly EventEnvelope $envelope) {}

    /**
     * Segundos de espera entre as retentativas.
     *
     * @return list<int>
     */
    public function backoff(): array
    {
        return [2, 10, 30, 60];
    }

    /**
     * @throws EventPublishingException
     */
    public function handle(EventTransport $transport): void
    {
        $transport->send($this->envelope);

        MessagingLog::publisher()->info('Evento publicado.', $this->logContext());
    }

    /**
     * Chamado quando o job falha de vez, esgotadas as tentativas.
     */
    public function failed(?Throwable $exception = null): void
    {
        MessagingLog::publisher()->error('Publicação abandonada: tentativas esgotadas, o job segue para a DLQ.', [
            ...$this->logContext(),
            'error' => $exception?->getMessage(),
        ]);
    }

    /**
     * @return array{event_id: string, event: string, exchange: string, attempt: int}
     */
    private function logContext(): array
    {
        return [
            'event_id' => $this->envelope->id,
            'event' => $this->envelope->routingKey,
            'exchange' => $this->envelope->exchange,
            'attempt' => $this->attempts(),
        ];
    }
}
