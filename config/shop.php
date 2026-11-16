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
    | Postal code lookup
    |--------------------------------------------------------------------------
    */

    'cep_lookup' => [
        'url' => 'https://viacep.com.br/ws/%s/json/',
        'timeout_seconds' => 5,
    ],

];
