<?php

namespace Tests\Fixtures\Messaging;

use App\Messaging\Consumer\IncomingEvent;
use App\Messaging\Contracts\EventHandler;
use RuntimeException;

/**
 * Handler de teste: guarda os eventos recebidos e pode ser instruído a falhar uma vez.
 *
 * Registrado como singleton no container (ver `recordingHandler()` em tests/Pest.php)
 * para que o teste enxergue a mesma instância que o job resolve.
 */
final class RecordingEventHandler implements EventHandler
{
    /**
     * @var list<IncomingEvent>
     */
    public array $handled = [];

    public bool $failNext = false;

    public function handle(IncomingEvent $event): void
    {
        if ($this->failNext) {
            $this->failNext = false;

            throw new RuntimeException('Falha simulada do handler.');
        }

        $this->handled[] = $event;
    }
}
