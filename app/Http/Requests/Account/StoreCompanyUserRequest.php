<?php

namespace App\Http\Requests\Account;

use App\Concerns\ProfileValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Unique;

class StoreCompanyUserRequest extends FormRequest
{
    use ProfileValidationRules;

    public function authorize(): bool
    {
        return $this->user()?->can('manage-company-users') ?? false;
    }

    /**
     * @return array<string, array<int, Unique|ValidationRule|array<mixed>|string>>
     */
    public function rules(): array
    {
        return $this->profileRules();
    }

    /**
     * Generic message: never reveal which company already owns the e-mail.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['email.unique' => 'Não foi possível vincular este e-mail.'];
    }
}
