<?php

namespace App\Jobs\Diagnostics;

use Exception;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Job de diagnóstico que sempre falha.
 *
 * Serve para validar o caminho de falha da fila: a mensagem deve ser rejeitada
 * pelo worker e roteada para a Dead Letter Queue (`<fila>_dlq`).
 * Disparado manualmente via `php artisan queue:probe --fail`.
 */
class QueueFailureProbeJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public const string FAILURE_MESSAGE = 'Erro forçado para enviar o Job para a Dead Letter Queue!';

    /**
     * Execute the job.
     *
     * @throws Exception
     */
    public function handle(): void
    {
        throw new Exception(self::FAILURE_MESSAGE);
    }
}
