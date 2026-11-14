<?php

use App\Jobs\Diagnostics\QueueFailureProbeJob;
use App\Jobs\Diagnostics\QueueHealthCheckJob;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use VladimirYuldashev\LaravelQueueRabbitMQ\Queue\RabbitMQQueue;

/*
 * Testes de integração com um RabbitMQ REAL.
 *
 * Ficam fora da execução padrão (são pulados sem RABBITMQ_INTEGRATION=true), para
 * não exigir broker no CI. Para rodar localmente, com o broker de pé (sail up -d):
 *
 *   RABBITMQ_INTEGRATION=true php artisan test --group=rabbitmq
 */

pest()->group('rabbitmq');

beforeEach(function () {
    if (! filter_var(env('RABBITMQ_INTEGRATION'), FILTER_VALIDATE_BOOLEAN)) {
        $this->markTestSkipped('Defina RABBITMQ_INTEGRATION=true e suba o RabbitMQ para rodar.');
    }

    $this->queueName = 'probe_'.Str::lower(Str::random(8));
    $this->deadLetterQueueName = $this->queueName.'_dlq';

    /** @var RabbitMQQueue $queue */
    $queue = Queue::connection('rabbitmq');
    $this->rabbit = $queue;

    // O driver NÃO cria a DLQ: sem ela a mensagem rejeitada é descartada pelo broker.
    // A fila principal é declarada pelo próprio driver no dispatch (já com os
    // argumentos x-dead-letter-*), por isso não pode ser pré-declarada aqui.
    $queue->declareQueue($this->deadLetterQueueName);
});

afterEach(function () {
    if (! isset($this->rabbit)) {
        return;
    }

    $this->rabbit->deleteQueue($this->queueName);
    $this->rabbit->deleteQueue($this->deadLetterQueueName);
});

function consumeOne(string $queueName): void
{
    Artisan::call('queue:work', [
        'connection' => 'rabbitmq',
        '--queue' => $queueName,
        '--once' => true,
        '--tries' => 1,
    ]);
}

test('consumes a healthy job and leaves both queues empty', function () {
    QueueHealthCheckJob::dispatch()->onConnection('rabbitmq')->onQueue($this->queueName);
    expect($this->rabbit->size($this->queueName))->toBe(1);

    consumeOne($this->queueName);

    expect($this->rabbit->size($this->queueName))->toBe(0)
        ->and($this->rabbit->size($this->deadLetterQueueName))->toBe(0);
});

test('routes a failing job to the dead letter queue', function () {
    QueueFailureProbeJob::dispatch()->onConnection('rabbitmq')->onQueue($this->queueName);

    consumeOne($this->queueName);

    expect($this->rabbit->size($this->queueName))->toBe(0)
        ->and($this->rabbit->size($this->deadLetterQueueName))->toBe(1);
});
