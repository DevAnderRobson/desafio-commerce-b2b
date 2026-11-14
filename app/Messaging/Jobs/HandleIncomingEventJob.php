<?php

namespace App\Messaging\Jobs;

use App\Messaging\Consumer\IncomingEvent;
use App\Messaging\Consumer\ProcessedEventStore;
use App\Messaging\Contracts\EventHandler;
use App\Messaging\Support\MessagingLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Executa o handler de um evento recebido, uma única vez por (evento, handler).
 *
 * O registro de idempotência e o handler rodam na mesma transação: duplicatas
 * são ignoradas, e se o handler falhar o registro é desfeito e a retentativa
 * executa o evento de novo. Esgotadas as tentativas, o job segue para a DLQ da
 * fila de execução.
 *
 * Logs no canal `messaging_consumer`.
 */
class HandleIncomingEventJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public int $tries = 5;

    /**
     * @param  class-string<EventHandler>  $handler
     */
    public function __construct(
        public readonly IncomingEvent $event,
        public readonly string $handler,
    ) {}

    /**
     * Segundos de espera entre as retentativas.
     *
     * @return list<int>
     */
    public function backoff(): array
    {
        return [5, 30, 120, 300];
    }

    /**
     * @throws Throwable
     */
    public function handle(ProcessedEventStore $store): void
    {
        try {
            $executed = DB::transaction(function () use ($store): bool {
                if (! $store->claim($this->event->id, $this->handler)) {
                    return false;
                }

                app($this->handler)->handle($this->event);

                return true;
            });
        } catch (Throwable $exception) {
            MessagingLog::consumer()->warning('Falha ao tratar o evento; será tentado novamente se houver tentativas.', [
                ...$this->logContext(),
                'error' => $exception->getMessage(),
            ]);

            throw $exception;
        }

        if ($executed) {
            MessagingLog::consumer()->info('Evento tratado.', $this->logContext());

            return;
        }

        MessagingLog::consumer()->info('Evento duplicado ignorado: já foi tratado por este handler.', $this->logContext());
    }

    /**
     * Chamado quando o job falha de vez, esgotadas as tentativas.
     */
    public function failed(?Throwable $exception = null): void
    {
        MessagingLog::consumer()->error('Tratamento abandonado: tentativas esgotadas, o job segue para a DLQ.', [
            ...$this->logContext(),
            'error' => $exception?->getMessage(),
        ]);
    }

    /**
     * @return array{event_id: string, event: string, handler: string, attempt: int}
     */
    private function logContext(): array
    {
        return [
            'event_id' => $this->event->id,
            'event' => $this->event->event,
            'handler' => $this->handler,
            'attempt' => $this->attempts(),
        ];
    }
}
