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
     * @param  array{heartbeat?: int, read_write_timeout?: float}  $overrides  ajustes para conexões de longa duração, como a do consumidor
     *
     * @throws AMQPExceptionInterface|Exception
     */
    public function open(array $overrides = []): AMQPStreamConnection
    {
        $config = [...$this->config, ...$overrides];

        return new AMQPStreamConnection(
            host: $config['host'],
            port: $config['port'],
            user: $config['user'],
            password: $config['password'],
            vhost: $config['vhost'],
            connection_timeout: $config['connection_timeout'],
            read_write_timeout: $config['read_write_timeout'],
            heartbeat: $config['heartbeat'],
        );
    }
}
