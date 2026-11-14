<?php

namespace App\Queue\Jobs;

use VladimirYuldashev\LaravelQueueRabbitMQ\Queue\Jobs\RabbitMQJob as BaseJob;

/**
 * Classe de job de fila do RabbitMQ, propositalmente vazia por enquanto.
 *
 * Ela existe para padronizar o ponto de extensão do driver: o `config/queue.php`
 * (`connections.rabbitmq.options.queue.job`) aponta para esta classe, e não para a
 * do pacote. Assim, se for preciso mudar qualquer comportamento do job no broker
 * (ack/nack, tratamento de falha, release, headers, retentativas), basta sobrescrever
 * o método aqui, sem tocar em `/config` nem na conexão.
 */
class RabbitMQJob extends BaseJob {}
