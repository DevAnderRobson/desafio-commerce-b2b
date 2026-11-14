<?php

namespace App\Console\Commands\Messaging;

use App\Messaging\Exceptions\TopologyException;
use App\Messaging\RabbitMq\TopologyDeclarer;
use App\Messaging\Topology\TopologyPlan;
use App\Messaging\Topology\TopologyPlanner;
use Illuminate\Console\Command;
use InvalidArgumentException;

/**
 * Declara no RabbitMQ a topologia de pub/sub descrita em `config/messaging.php`.
 *
 * Uso:
 *   php artisan messaging:setup             # aplica a topologia no broker
 *   php artisan messaging:setup --dry-run   # só mostra o plano, sem conectar
 *
 * O que é criado (tudo durável e idempotente, pode rodar a cada deploy):
 *   - as exchanges listadas em `topology.exchanges`;
 *   - a DLQ (`<fila>_dlq`) de cada fila interna em `topology.internal_queues`
 *     (a fila principal é criada pelo driver da fila, no primeiro dispatch);
 *   - cada fila de `topology.consumer_queues`, com sua DLQ e seus bindings.
 *
 * Sem a DLQ, o RabbitMQ descarta em silêncio as mensagens rejeitadas.
 * Se um recurso já existe com argumentos diferentes, o broker recusa a alteração
 * e o comando falha explicando o conflito; nada é apagado automaticamente.
 *
 * Cada passo é registrado em `storage/logs/messaging/topology-<data>.log`.
 */
class MessagingSetupCommand extends Command
{
    /**
     * @var string
     */
    protected $signature = 'messaging:setup
        {--dry-run : Mostra o plano sem conectar ao broker}';

    /**
     * @var string
     */
    protected $description = 'Declara exchanges, filas, bindings e DLQs do pub/sub no RabbitMQ';

    /**
     * Execute the console command.
     */
    public function handle(TopologyPlanner $planner, TopologyDeclarer $declarer): int
    {
        try {
            $plan = $planner->plan();
        } catch (InvalidArgumentException $exception) {
            $this->components->error('Configuração de topologia inválida: '.$exception->getMessage());

            return self::FAILURE;
        }

        $this->showPlan($plan);

        if ($this->option('dry-run')) {
            $this->components->info('Dry-run: nada foi enviado ao broker.');

            return self::SUCCESS;
        }

        try {
            $declarer->apply($plan);
        } catch (TopologyException $exception) {
            $this->components->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->components->info('Topologia aplicada com sucesso.');

        return self::SUCCESS;
    }

    private function showPlan(TopologyPlan $plan): void
    {
        foreach ($plan->exchanges as $exchange) {
            $this->components->twoColumnDetail('exchange', "{$exchange->name} [{$exchange->type}]");
        }

        foreach ($plan->queues as $queue) {
            $deadLetter = $queue->deadLetterRoutingKey === null ? '' : " (dead letter -> {$queue->deadLetterRoutingKey})";
            $this->components->twoColumnDetail('fila', $queue->name.$deadLetter);
        }

        foreach ($plan->bindings as $binding) {
            $this->components->twoColumnDetail('binding', "{$binding->queue} <- {$binding->exchange} [{$binding->routingKey}]");
        }
    }
}
