<?php

namespace App\Checkout;

interface CepLookup
{
    /**
     * @param  string  $cep  8 digits
     * @return array{cep: string, street: string, neighborhood: string, city: string, state: string}|null null when the CEP does not exist
     *
     * @throws CepLookupUnavailable when the external service fails
     */
    public function find(string $cep): ?array;
}
