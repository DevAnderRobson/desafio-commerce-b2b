<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Shipping (simulated, D12)
    |--------------------------------------------------------------------------
    |
    | Subtotal (in cents) from which the economic option is free, and the share of the subtotal
    | (in basis points) added to the base price of each option.
    |
    */

    'freight' => [
        'free_shipping_threshold_cents' => 200_000,
        'subtotal_surcharge_bps' => 100,
    ],

    /*
    |--------------------------------------------------------------------------
    | Payment (simulated gateway, D12)
    |--------------------------------------------------------------------------
    |
    | outcome: approved | refused | transient | flaky. delay_seconds slows the gateway down so the
    | processing screen can be seen. Pending orders older than expire_minutes are expired.
    |
    */

    'payment' => [
        'outcome' => env('SHOP_PAYMENT_OUTCOME', 'approved'),
        'delay_seconds' => (int) env('SHOP_PAYMENT_DELAY', 3),
        'expire_minutes' => (int) env('SHOP_PAYMENT_EXPIRE_MINUTES', 30),
        'tracking_timeout_minutes' => 3,
        'polling_intervals_ms' => [1500, 2500, 4000, 6000],
    ],

    /*
    |--------------------------------------------------------------------------
    | Shipping tracking (simulated, D12)
    |--------------------------------------------------------------------------
    |
    | A shipped order gets one new tracking event every `tracking_interval_minutes`, city by
    | city, until the delivery event; only then the order becomes delivered.
    |
    */

    'shipping' => [
        'carrier' => 'TransLog Express',
        'origin_city' => 'Curitiba',
        'origin_state' => 'PR',
        'tracking_interval_minutes' => (int) env('SHOP_TRACKING_INTERVAL', 1),
    ],

    /*
    |--------------------------------------------------------------------------
    | Postal code lookup
    |--------------------------------------------------------------------------
    */

    'cep_lookup' => [
        'url' => 'https://viacep.com.br/ws/%s/json/',
        'timeout_seconds' => 5,
    ],

];
