<?php

use App\Messaging\Handlers\LogIncomingEventHandler;

/*
|--------------------------------------------------------------------------
| Mensageria (pub/sub entre sistemas)
|--------------------------------------------------------------------------
|
| Configuração do módulo app/Messaging. É independente do config/queue.php,
| que serve apenas à fila de execução (jobs internos). As credenciais são as
| mesmas variáveis RABBITMQ_* já usadas pela fila.
|
*/

return [

    /*
    | Conexão AMQP usada para publicar eventos. A conexão é aberta e fechada a
    | cada publicação (ver RabbitMqEventTransport), por isso o heartbeat fica
    | desligado: não há conexão ociosa para manter viva.
    */
    'connection' => [
        'host' => env('RABBITMQ_HOST', 'rabbitmq'),
        'port' => (int) env('RABBITMQ_PORT', 5672),
        'user' => env('RABBITMQ_USER', 'sail'),
        'password' => env('RABBITMQ_PASSWORD', 'password'),
        'vhost' => env('RABBITMQ_VHOST', '/'),
        'connection_timeout' => (float) env('MESSAGING_CONNECTION_TIMEOUT', 3.0),
        'read_write_timeout' => (float) env('MESSAGING_READ_WRITE_TIMEOUT', 10.0),
        'heartbeat' => 0,
    ],

    'publisher' => [
        // Tempo máximo, em segundos, esperando o broker confirmar a mensagem.
        'confirm_timeout' => (float) env('MESSAGING_CONFIRM_TIMEOUT', 5.0),
    ],

    /*
    | Consumo de eventos (`php artisan events:consume {fila}`). Diferente da
    | publicação, o consumidor mantém UMA conexão aberta por muito tempo, então
    | ela usa heartbeat para detectar conexões mortas. O `read_write_timeout`
    | precisa ser de pelo menos o dobro do heartbeat.
    */
    'consumer' => [
        // Mensagens entregues de uma vez, ainda sem confirmação.
        'prefetch' => (int) env('MESSAGING_CONSUMER_PREFETCH', 20),

        // Segundos esperando uma mensagem antes de reavaliar sinais e limites.
        'wait_timeout' => (int) env('MESSAGING_CONSUMER_WAIT_TIMEOUT', 5),

        'connection' => [
            'heartbeat' => 30,
            'read_write_timeout' => 90.0,
        ],
    ],

    /*
    | Filas que NÓS consumimos de outros sistemas.
    |
    |   nome da fila => [
    |       'exchange' => exchange de onde os eventos vêm (deve estar em topology.exchanges),
    |       'handlers' => [ routing key do evento => classe EventHandler ],
    |   ]
    |
    | Esta é a única fonte para o consumo: o `messaging:setup` cria a fila, a DLQ e um
    | binding por routing key listada, e o consumidor roteia pelo mesmo mapa. A fila só
    | recebe eventos que sabemos tratar. Para tratar um novo evento, adicione a routing
    | key com seu handler e rode `messaging:setup` de novo.
    |
    | Os eventos abaixo são a proposta para o serviço de rastreio de entregas, a alinhar
    | com o time dele. LogIncomingEventHandler é provisório: só registra o evento.
    */
    'consumers' => [
        'ecommerce.deliveries' => [
            'exchange' => 'deliveries',
            'handlers' => [
                'delivery.status_updated' => LogIncomingEventHandler::class,
                'delivery.route_updated' => LogIncomingEventHandler::class,
            ],
        ],
    ],

    /*
    | Topologia aplicada pelo comando `php artisan messaging:setup` (idempotente).
    |
    | exchanges        nome => tipo (direct, topic, fanout ou headers). Liste aqui as
    |                  exchanges que publicamos e também as de outros sistemas nas
    |                  quais vamos nos ligar; declarar uma exchange existente é seguro
    |                  desde que o tipo seja o mesmo.
    | internal_queues  filas do `queue:work` (jobs internos). O setup cria apenas a DLQ
    |                  (`<fila>_dlq`); a fila principal é declarada pelo próprio driver
    |                  no primeiro dispatch, já com os argumentos de dead letter.
    |
    | As filas consumidas (acima, em `consumers`) também entram no setup, com DLQ e bindings.
    | O nome da DLQ e a exchange de dead letter seguem `queue.connections.rabbitmq.options.queue`
    | (`failed_routing_key` e `failed_exchange`), a mesma fonte usada pelo driver da fila.
    */
    'topology' => [
        'exchanges' => [
            'orders' => 'topic',
            'deliveries' => 'topic',
        ],

        'internal_queues' => [
            'default',
        ],
    ],

];
