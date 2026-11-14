<?php

namespace App\Console\Commands\Messaging;

use App\Messaging\Consumer\EventRouter;
use App\Messaging\Exceptions\ConsumerException;
use App\Messaging\RabbitMq\RabbitMqEventConsumer;
use Illuminate\Console\Command;
use InvalidArgumentException;

/**
 * Consome eventos publicados por outros sistemas numa fila declarada em
 * `messaging.consumers` (ex.: `ecommerce.deliveries`, do serviço de rastreio).
 *
 * Uso:
 *   php artisan events:consume ecommerce.deliveries
 *   php artisan events:consume ecommerce.deliveries --stop-when-empty
 *   php artisan events:consume ecommerce.deliveries --max-messages=500 --max-time=3600
 *
 * Fluxo de cada mensagem: valida o envelope JSON, localiza o handler pela routing
 * key e agenda um job na fila de execução (que roda o handler uma vez por evento,
 * com retentativas). Mensagem inválida ou sem handler vai para a DLQ da fila.
 *
 * É um processo de longa duração: em produção rode sob um supervisor, que o reinicia
 * se cair. Use --max-messages ou --max-time para reciclá-lo periodicamente. A fila e
 * os bindings precisam existir: rode `php artisan messaging:setup` antes.
 *
 * Logs em `storage/logs/messaging/consumer-<data>.log`.
 */
class ConsumeEventsCommand extends Command
{
    /**
     * @var string
     */
    protected $signature = 'events:consume
        {queue : Fila declarada em messaging.consumers}
        {--max-messages= : Encerra após tratar esta quantidade de mensagens}
        {--max-time= : Encerra após este número de segundos}
        {--stop-when-empty : Encerra quando a fila ficar vazia}';

    /**
     * @var string
     */
    protected $description = 'Consome eventos de outros sistemas e agenda seus handlers';

    /**
     * Execute the console command.
     */
    public function handle(EventRouter $router, RabbitMqEventConsumer $consumer): int
    {
        $queue = (string) $this->argument('queue');

        if (! in_array($queue, $router->queues(), true)) {
            $this->components->error(sprintf(
                'A fila "%s" não está em messaging.consumers. Filas disponíveis: %s.',
                $queue,
                $router->queues() === [] ? '(nenhuma)' : implode(', ', $router->queues()),
            ));

            return self::FAILURE;
        }

        try {
            $router->assertValid($queue);
        } catch (InvalidArgumentException $exception) {
            $this->components->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->components->info("Consumindo a fila \"{$queue}\". Ctrl+C para encerrar.");

        try {
            $handled = $consumer->consume(
                $queue,
                $this->option('max-messages') === null ? null : (int) $this->option('max-messages'),
                $this->option('max-time') === null ? null : (int) $this->option('max-time'),
                (bool) $this->option('stop-when-empty'),
            );
        } catch (ConsumerException $exception) {
            $this->components->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->components->info("Consumidor encerrado. Mensagens tratadas: {$handled}.");

        return self::SUCCESS;
    }
}
