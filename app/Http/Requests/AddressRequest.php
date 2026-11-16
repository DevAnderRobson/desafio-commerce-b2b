<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AddressRequest extends FormRequest
{
    /** @var list<string> */
    public const STATES = [
        'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA',
        'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
    ];

    public function authorize(): bool
    {
        return $this->user()?->can('checkout') ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'cep' => preg_replace('/\D/', '', (string) $this->input('cep')),
            'state' => strtoupper(trim((string) $this->input('state'))),
        ]);
    }

    /**
     * @return array<string, array<int, ValidationRule|string>>
     */
    public function rules(): array
    {
        return [
            'label' => ['nullable', 'string', 'max:60'],
            'cep' => ['required', 'digits:8'],
            'street' => ['required', 'string', 'max:255'],
            'number' => ['required', 'string', 'max:20'],
            'complement' => ['nullable', 'string', 'max:255'],
            'neighborhood' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:255'],
            'state' => ['required', Rule::in(self::STATES)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'cep.required' => 'Informe o CEP.',
            'cep.digits' => 'O CEP deve ter 8 números.',
            'street.required' => 'Informe o logradouro.',
            'number.required' => 'Informe o número (ou "s/n").',
            'neighborhood.required' => 'Informe o bairro.',
            'city.required' => 'Informe a cidade.',
            'state.required' => 'Escolha o estado.',
            'state.in' => 'Escolha um estado válido.',
        ];
    }
}
