<?php

namespace App\Messaging\Consumer;

use App\Messaging\Exceptions\InvalidIncomingEventException;
use App\Messaging\Jobs\HandleIncomingEventJob;
use App\Messaging\Support\MessagingLog;
use Illuminate\Support\Str;

/**
 * Decide o destino de uma mensagem recebida, sem depender do broker.
 *
 * Valida o envelope, localiza o handler e agenda um `HandleIncomingEventJob` na
 * fila de execução. O consumidor só confirma a mensagem depois que o agendamento
 * deu certo. Se o processo cair entre o agendamento e a confirmação, a mensagem
 * é reentregue e o job é deduplicado pelo registro de idempotência.
 */
final class IncomingMessageProcessor
{
    private const int LOGGED_BODY_LIMIT = 300;

    public function __construct(
        private readonly IncomingEventParser $parser,
        private readonly EventRouter $router,
    ) {}

    public function process(string $queue, string $body): Disposition
    {
        try {
            $event = $this->parser->parse($body);
        } catch (InvalidIncomingEventException $exception) {
            MessagingLog::consumer()->error('Mensagem inválida enviada para a DLQ.', [
                'queue' => $queue,
                'reason' => $exception->getMessage(),
                'body' => Str::limit($body, self::LOGGED_BODY_LIMIT),
            ]);

            return Disposition::DeadLetter;
        }

        $handler = $this->router->handlerFor($queue, $event->event);

        if ($handler === null) {
            MessagingLog::consumer()->error('Evento sem handler configurado enviado para a DLQ.', [
                'queue' => $queue,
                'event_id' => $event->id,
                'event' => $event->event,
            ]);

            return Disposition::DeadLetter;
        }

        HandleIncomingEventJob::dispatch($event, $handler);

        MessagingLog::consumer()->info('Evento recebido e agendado para tratamento.', [
            'queue' => $queue,
            'event_id' => $event->id,
            'event' => $event->event,
            'version' => $event->version,
            'handler' => $handler,
        ]);

        return Disposition::Ack;
    }
}
