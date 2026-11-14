<?php

namespace App\Messaging\Support;

use Illuminate\Support\Facades\Log;
use Psr\Log\LoggerInterface;

/**
 * Canais de log exclusivos do módulo de mensageria, definidos em `config/logging.php`.
 *
 * Tudo que o módulo registra vai para `storage/logs/messaging/<canal>-<data>.log`,
 * separado do `laravel.log`, para que erros de pub/sub sejam fáceis de achar.
 *
 *   publisher: publicação de eventos (agendamento, sucesso, falhas, esgotamento)
 *   topology:  `messaging:setup` (exchanges, filas, bindings e DLQs)
 *   consumer:  consumo de eventos de outros sistemas (`events:consume` e seus jobs)
 */
final class MessagingLog
{
    public const string PUBLISHER = 'messaging_publisher';

    public const string TOPOLOGY = 'messaging_topology';

    public const string CONSUMER = 'messaging_consumer';

    public static function publisher(): LoggerInterface
    {
        return Log::channel(self::PUBLISHER);
    }

    public static function topology(): LoggerInterface
    {
        return Log::channel(self::TOPOLOGY);
    }

    public static function consumer(): LoggerInterface
    {
        return Log::channel(self::CONSUMER);
    }
}
