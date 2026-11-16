<?php

namespace App\Checkout;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

class ViaCepLookup implements CepLookup
{
    public function find(string $cep): ?array
    {
        try {
            $response = Http::timeout((int) config('shop.cep_lookup.timeout_seconds'))
                ->acceptJson()
                ->get(sprintf((string) config('shop.cep_lookup.url'), $cep));
        } catch (ConnectionException $exception) {
            throw new CepLookupUnavailable('CEP lookup timed out or failed to connect.', previous: $exception);
        }

        if ($response->failed()) {
            throw new CepLookupUnavailable("CEP lookup returned HTTP {$response->status()}.");
        }

        $data = $response->json();

        if (! is_array($data) || ($data['erro'] ?? false)) {
            return null;
        }

        return [
            'cep' => substr($cep, 0, 5).'-'.substr($cep, 5),
            'street' => (string) ($data['logradouro'] ?? ''),
            'neighborhood' => (string) ($data['bairro'] ?? ''),
            'city' => (string) ($data['localidade'] ?? ''),
            'state' => strtoupper((string) ($data['uf'] ?? '')),
        ];
    }
}
