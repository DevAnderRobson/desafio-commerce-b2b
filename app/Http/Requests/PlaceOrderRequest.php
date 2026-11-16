<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class PlaceOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('checkout') ?? false;
    }

    /**
     * @return array<string, array<int, ValidationRule|string>>
     */
    public function rules(): array
    {
        return [
            'payment_term_code' => ['required', 'string', 'max:20'],
            'idempotency_key' => ['required', 'string', 'max:64'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'payment_term_code.required' => 'Escolha uma condição de pagamento.',
            'idempotency_key.required' => 'Não foi possível confirmar o pedido. Recarregue a página e tente novamente.',
        ];
    }
}
