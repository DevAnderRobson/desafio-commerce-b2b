<?php

use App\Customers\Cnpj;

it('validates cnpj check digits', function (string $value, bool $valid) {
    expect(Cnpj::isValid($value))->toBe($valid);
})->with([
    'valid masked' => ['11.222.333/0001-81', true],
    'valid digits only' => ['11222333000181', true],
    'wrong digit' => ['11.222.333/0001-80', false],
    'repeated' => ['00.000.000/0000-00', false],
    'letters' => ['abc', false],
]);

it('formats a cnpj with the mask and leaves other values alone', function () {
    expect(Cnpj::format('11222333000181'))->toBe('11.222.333/0001-81')
        ->and(Cnpj::format('123'))->toBe('123');
});
