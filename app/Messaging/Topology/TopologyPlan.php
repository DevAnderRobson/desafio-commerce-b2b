<?php

namespace App\Messaging\Topology;

/**
 * Plano de topologia na ordem em que deve ser aplicado: exchanges, depois filas
 * (DLQs antes das filas que apontam para elas) e, por fim, os bindings.
 */
final readonly class TopologyPlan
{
    /**
     * @param  list<ExchangeDefinition>  $exchanges
     * @param  list<QueueDefinition>  $queues
     * @param  list<BindingDefinition>  $bindings
     */
    public function __construct(
        public array $exchanges,
        public array $queues,
        public array $bindings,
    ) {}
}
