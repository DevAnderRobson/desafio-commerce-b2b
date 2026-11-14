<?php

namespace App\Console\Commands\Diagnostics;

use App\Jobs\Diagnostics\QueueFailureProbeJob;
use App\Jobs\Diagnostics\QueueHealthCheckJob;
use Illuminate\Console\Command;

/**
 * Dispara jobs de diagnóstico para validar a fila manualmente.
 *
 * Uso:
 *   php artisan queue:probe                       # job de sucesso (log no worker)
 *   php artisan queue:probe --fail                # job que falha (vai para a DLQ)
 *   php artisan queue:probe --count=50            # envia 50 jobs
 *   php artisan queue:probe --connection=rabbitmq --queue=default
 *
 * Para consumir, mantenha um worker rodando (ex.: `php artisan queue:work rabbitmq`)
 * e acompanhe com `php artisan pail`. Falhas aparecem na fila `<fila>_dlq`, visível
 * no painel do RabbitMQ (porta 15672).
 *
 * Em produção o comando é bloqueado, a menos que `--force` seja informado.
 */
class QueueProbeCommand extends Command
{
    private const int MAX_COUNT = 1000;

    /**
     * @var string
     */
    protected $signature = 'queue:probe
        {--fail : Dispara o job que falha, para testar a Dead Letter Queue}
        {--count=1 : Quantidade de jobs a disparar}
        {--connection= : Conexão de fila (padrão: QUEUE_CONNECTION)}
        {--queue= : Nome da fila (padrão: o da conexão)}
        {--force : Permite executar em produção}';

    /**
     * @var string
     */
    protected $description = 'Dispara jobs de diagnóstico para testar a fila (sucesso ou falha/DLQ)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        if (app()->isProduction() && ! $this->option('force')) {
            $this->components->error('Comando bloqueado em produção. Use --force se for realmente necessário.');

            return self::FAILURE;
        }

        $count = (int) $this->option('count');

        if ($count < 1 || $count > self::MAX_COUNT) {
            $this->components->error('--count deve estar entre 1 e '.self::MAX_COUNT.'.');

            return self::FAILURE;
        }

        $jobClass = $this->option('fail') ? QueueFailureProbeJob::class : QueueHealthCheckJob::class;
        $connection = $this->option('connection') ?: null;
        $queue = $this->option('queue') ?: null;

        for ($i = 0; $i < $count; $i++) {
            $jobClass::dispatch()->onConnection($connection)->onQueue($queue);
        }

        $jobClass
            |> class_basename(...)
            |> (fn ($x) => sprintf(
                '%d job(s) %s disparado(s) [conexão: %s | fila: %s].',
                $count,
                $x,
                $connection ?? config('queue.default'), $queue ?? 'padrão',
            )
            )
            |> $this->components->info(...);

        return self::SUCCESS;
    }
}
