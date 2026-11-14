<?php

namespace App\Jobs\Diagnostics;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Job de diagnóstico que sempre termina com sucesso.
 *
 * Serve para validar, de ponta a ponta, que a mensagem foi publicada na fila
 * e consumida por um worker. Disparado manualmente via `php artisan queue:probe`.
 * Não faz parte das regras de negócio da aplicação.
 */
class QueueHealthCheckJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public const string LOG_MESSAGE = 'Job de diagnóstico processado com sucesso pela fila!';

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        Log::info(self::LOG_MESSAGE);
    }
}
