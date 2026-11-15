<?php

namespace App\Rules;

use App\Customers\Cnpj;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ValidCnpj implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! Cnpj::isValid($value)) {
            $fail('Informe um CNPJ válido.');
        }
    }
}
