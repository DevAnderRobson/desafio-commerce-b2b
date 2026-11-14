<?php

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
    | Conexão AMQP usada para publicar e consumir eventos. A conexão é aberta
    | e fechada a cada publicação (ver RabbitMqEventTransport), por isso o
    | heartbeat fica desligado: não há conexão ociosa para manter viva.
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
    | Topologia aplicada pelo comando `php artisan messaging:setup` (idempotente).
    |
    | exchanges        nome => tipo (direct, topic, fanout ou headers). Liste aqui as
    |                  exchanges que publicamos e também as de outros sistemas nas
    |                  quais vamos nos ligar; declarar uma exchange existente é seguro
    |                  desde que o tipo seja o mesmo.
    | internal_queues  filas do `queue:work` (jobs internos). O setup cria apenas a DLQ
    |                  (`<fila>_dlq`); a fila principal é declarada pelo próprio driver
    |                  no primeiro dispatch, já com os argumentos de dead letter.
    | consumer_queues  filas que NÓS consumimos de outros sistemas. O setup cria a fila,
    |                  a DLQ e os bindings:
    |                    'ecommerce.billing' => [
    |                        ['exchange' => 'billing', 'routing_key' => 'invoice.issued'],
    |                    ],
    |
    | O nome da DLQ e a exchange de dead letter seguem `queue.connections.rabbitmq.options.queue`
    | (`failed_routing_key` e `failed_exchange`), a mesma fonte usada pelo driver da fila.
    */
    'topology' => [
        'exchanges' => [
            'orders' => 'topic',
        ],

        'internal_queues' => [
            'default',
        ],

        'consumer_queues' => [],
    ],

];
