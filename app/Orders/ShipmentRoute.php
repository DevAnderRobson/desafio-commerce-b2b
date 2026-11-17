<?php

namespace App\Orders;

use App\Models\Order;

/**
 * Simulated path of a parcel from the distribution center to the customer, city by city. The
 * route is deterministic for an order (origin, regional hubs by destination state, destination
 * city), so every scan can be derived from how many events were already recorded.
 */
class ShipmentRoute
{
    /**
     * Regional hubs between the distribution center and each destination state.
     *
     * @var array<string, list<array{string, string}>>
     */
    private const HUBS = [
        'PR' => [],
        'SC' => [['Joinville', 'SC']],
        'RS' => [['Joinville', 'SC'], ['Porto Alegre', 'RS']],
        'SP' => [['São Paulo', 'SP']],
        'RJ' => [['São Paulo', 'SP'], ['Rio de Janeiro', 'RJ']],
        'MG' => [['São Paulo', 'SP'], ['Belo Horizonte', 'MG']],
        'ES' => [['São Paulo', 'SP'], ['Rio de Janeiro', 'RJ'], ['Vitória', 'ES']],
        'MS' => [['Campo Grande', 'MS']],
        'MT' => [['Campo Grande', 'MS'], ['Cuiabá', 'MT']],
        'GO' => [['São Paulo', 'SP'], ['Goiânia', 'GO']],
        'DF' => [['São Paulo', 'SP'], ['Brasília', 'DF']],
        'BA' => [['São Paulo', 'SP'], ['Belo Horizonte', 'MG'], ['Salvador', 'BA']],
    ];

    /**
     * States without a dedicated chain go through the national hub in Brasília.
     *
     * @var list<array{string, string}>
     */
    private const NATIONAL_HUBS = [['São Paulo', 'SP'], ['Brasília', 'DF']];

    /**
     * @return list<array{code: string, title: string, description: string, city: string, state: string}>
     */
    public function plan(Order $order): array
    {
        $originCity = (string) config('shop.shipping.origin_city');
        $originState = (string) config('shop.shipping.origin_state');
        $address = $order->address_snapshot ?? [];
        $destCity = (string) ($address['city'] ?? 'Destino');
        $destState = strtoupper((string) ($address['state'] ?? $originState));

        $stops = [[$originCity, $originState], ...(self::HUBS[$destState] ?? self::NATIONAL_HUBS)];

        if (($stops[array_key_last($stops)] ?? null) !== [$destCity, $destState]) {
            $stops[] = [$destCity, $destState];
        }

        $events = [[
            'code' => 'posted',
            'title' => 'Objeto postado',
            'description' => 'Pedido separado e entregue à transportadora no centro de distribuição.',
            'city' => $originCity,
            'state' => $originState,
        ]];

        $previous = $stops[0];

        foreach (array_slice($stops, 1) as [$toCity, $toState]) {
            [$fromCity, $fromState] = $previous;
            $previous = [$toCity, $toState];

            $events[] = [
                'code' => 'in_transit',
                'title' => 'Em trânsito',
                'description' => "Objeto em transferência de {$fromCity}/{$fromState} para {$toCity}/{$toState}.",
                'city' => $fromCity,
                'state' => $fromState,
            ];
            $events[] = [
                'code' => 'at_hub',
                'title' => 'Chegou à unidade de distribuição',
                'description' => "Objeto recebido na unidade de {$toCity}/{$toState}.",
                'city' => $toCity,
                'state' => $toState,
            ];
        }

        $events[] = [
            'code' => 'out_for_delivery',
            'title' => 'Saiu para entrega',
            'description' => 'Objeto saiu para entrega ao destinatário.',
            'city' => $destCity,
            'state' => $destState,
        ];
        $events[] = [
            'code' => 'delivered',
            'title' => 'Entregue',
            'description' => 'Objeto entregue ao destinatário no endereço informado.',
            'city' => $destCity,
            'state' => $destState,
        ];

        return $events;
    }
}
