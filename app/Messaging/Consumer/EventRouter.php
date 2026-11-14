<?php

namespace App\Messaging\Consumer;

use App\Messaging\Contracts\EventHandler;
use Illuminate\Container\Attributes\Config;
use InvalidArgumentException;

/**
 * Descobre qual handler trata cada evento recebido, a partir de `messaging.consumers`.
 *
 * A correspondência é exata, pelo campo `event` do envelope. Os mesmos pares
 * routing key -> handler definem os bindings criados pelo `messaging:setup`, então
 * a fila só recebe os eventos que sabemos tratar.
 */
final class EventRouter
{
    /**
     * @param  array<string, array{exchange: string, handlers: array<string, string>}>  $consumers
     */
    public function __construct(#[Config('messaging.consumers')] private readonly array $consumers) {}

    /**
     * Nomes das filas consumidas.
     *
     * @return list<string>
     */
    public function queues(): array
    {
        return array_keys($this->consumers);
    }

    /**
     * @return class-string<EventHandler>|null
     *
     * @throws InvalidArgumentException se o handler configurado não for um `EventHandler`
     */
    public function handlerFor(string $queue, string $event): ?string
    {
        $handler = $this->consumers[$queue]['handlers'][$event] ?? null;

        return $handler === null ? null : $this->validated($queue, $event, $handler);
    }

    /**
     * Garante que todo handler configurado para a fila existe e implementa `EventHandler`.
     *
     * @throws InvalidArgumentException
     */
    public function assertValid(string $queue): void
    {
        foreach ($this->consumers[$queue]['handlers'] ?? [] as $event => $handler) {
            $this->validated($queue, $event, $handler);
        }
    }

    /**
     * @return class-string<EventHandler>
     *
     * @throws InvalidArgumentException
     */
    private function validated(string $queue, string $event, string $handler): string
    {
        if (! is_a($handler, EventHandler::class, true)) {
            throw new InvalidArgumentException(sprintf(
                'O handler "%s" do evento "%s" (fila "%s") não existe ou não implementa %s.',
                $handler,
                $event,
                $queue,
                EventHandler::class,
            ));
        }

        return $handler;
    }
}
