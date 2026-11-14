<?php

namespace App\Messaging\Testing;

use App\Messaging\Contracts\EventPublisher;
use App\Messaging\Contracts\PublishableEvent;
use App\Messaging\EventEnvelope;
use Closure;
use PHPUnit\Framework\Assert;

/**
 * Substituto de teste do `EventPublisher`, no estilo do `Queue::fake()`.
 *
 * Não enfileira nem fala com o broker: apenas registra os eventos anunciados.
 *
 *   $publisher = FakeEventPublisher::fake();
 *   // ... executa o código de negócio ...
 *   $publisher->assertPublished(OrderCreated::class, fn (OrderCreated $e) => $e->orderId === 1);
 */
final class FakeEventPublisher implements EventPublisher
{
    /**
     * @var list<PublishableEvent>
     */
    private array $published = [];

    /**
     * Instala o fake no container e o devolve para as asserções.
     */
    public static function fake(): self
    {
        $fake = new self;
        app()->instance(EventPublisher::class, $fake);

        return $fake;
    }

    public function publish(PublishableEvent $event): void
    {
        // Monta o envelope como em produção, para que dados não serializáveis em JSON falhem nos testes.
        EventEnvelope::wrap($event);

        $this->published[] = $event;
    }

    /**
     * Eventos anunciados da classe informada que passam no filtro.
     *
     * @param  class-string<PublishableEvent>  $eventClass
     * @param  (Closure(PublishableEvent): bool)|null  $callback
     * @return list<PublishableEvent>
     */
    public function published(string $eventClass, ?Closure $callback = null): array
    {
        return array_values(array_filter(
            $this->published,
            fn (PublishableEvent $event): bool => $event instanceof $eventClass
                && ($callback === null || $callback($event)),
        ));
    }

    /**
     * @param  class-string<PublishableEvent>  $eventClass
     * @param  (Closure(PublishableEvent): bool)|null  $callback
     */
    public function assertPublished(string $eventClass, ?Closure $callback = null): void
    {
        Assert::assertNotEmpty(
            $this->published($eventClass, $callback),
            "O evento [{$eventClass}] não foi publicado.",
        );
    }

    /**
     * @param  class-string<PublishableEvent>  $eventClass
     */
    public function assertPublishedTimes(string $eventClass, int $times): void
    {
        $count = count($this->published($eventClass));

        Assert::assertSame($times, $count, "O evento [{$eventClass}] foi publicado {$count} vez(es), esperado {$times}.");
    }

    /**
     * @param  class-string<PublishableEvent>  $eventClass
     * @param  (Closure(PublishableEvent): bool)|null  $callback
     */
    public function assertNotPublished(string $eventClass, ?Closure $callback = null): void
    {
        Assert::assertEmpty(
            $this->published($eventClass, $callback),
            "O evento [{$eventClass}] foi publicado inesperadamente.",
        );
    }

    public function assertNothingPublished(): void
    {
        Assert::assertEmpty($this->published, 'Eventos foram publicados inesperadamente.');
    }
}
