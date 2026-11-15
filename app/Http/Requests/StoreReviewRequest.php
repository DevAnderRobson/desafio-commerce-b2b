<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('view-prices') ?? false;
    }

    /**
     * Only these fields are read; `verified_purchase` is computed by the system, never accepted.
     *
     * @return array<string, array<int, ValidationRule|string>>
     */
    public function rules(): array
    {
        return [
            'rating' => ['required', 'integer', 'between:1,5'],
            'title' => ['nullable', 'string', 'max:120'],
            'body' => ['required', 'string', 'min:10', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'rating.required' => 'Escolha uma nota de 1 a 5.',
            'rating.between' => 'A nota deve estar entre 1 e 5.',
            'body.required' => 'Conte como foi sua experiência com o produto.',
            'body.min' => 'Escreva pelo menos 10 caracteres.',
            'body.max' => 'O comentário pode ter até 2000 caracteres.',
            'title.max' => 'O título pode ter até 120 caracteres.',
        ];
    }
}
