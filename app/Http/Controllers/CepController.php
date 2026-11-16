<?php

namespace App\Http\Controllers;

use App\Checkout\CepLookup;
use App\Checkout\CepLookupUnavailable;
use Illuminate\Http\JsonResponse;

class CepController extends Controller
{
    public function __invoke(CepLookup $lookup, string $cep): JsonResponse
    {
        if (preg_match('/^\d{8}$/', $cep) !== 1) {
            return response()->json(['message' => 'CEP inválido.'], 422);
        }

        try {
            $address = $lookup->find($cep);
        } catch (CepLookupUnavailable) {
            return response()->json(['message' => 'Não foi possível consultar o CEP agora. Preencha manualmente.'], 503);
        }

        return $address === null
            ? response()->json(['message' => 'CEP não encontrado.'], 404)
            : response()->json($address);
    }
}
