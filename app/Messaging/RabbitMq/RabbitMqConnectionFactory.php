<?php

namespace App\Messaging\RabbitMq;

use Exception;
use Illuminate\Container\Attributes\Config;
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Exception\AMQPExceptionInterface;

/**
 * Abre conexões AMQP a partir do `config/messaging.php`.
 *
 * Cada chamada a `open()` cria uma conexão nova. Quem a recebe é responsável
 * por fechá-la.
 */
final class RabbitMqConnectionFactory
{
    /**
     * @param  array{host: string, port: int, user: string, password: string, vhost: string, connection_timeout: float, read_write_timeout: float, heartbeat: int}  $config
     */
    public function __construct(#[Config('messaging.connection')] private readonly array $config) {}

    /**
     * @throws AMQPExceptionInterface|Exception
     */
    public function open(): AMQPStreamConnection
    {
        return new AMQPStreamConnection(
            host: $this->config['host'],
            port: $this->config['port'],
            user: $this->config['user'],
            password: $this->config['password'],
            vhost: $this->config['vhost'],
            connection_timeout: $this->config['connection_timeout'],
            read_write_timeout: $this->config['read_write_timeout'],
            heartbeat: $this->config['heartbeat'],
        );
    }
}
