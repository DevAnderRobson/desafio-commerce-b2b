<?php

namespace App\Http\Requests\Account;

use App\Http\Requests\AddressRequest;

/**
 * Same fields as the checkout address form; managing the company addresses only needs an
 * approved company (a blocked company can still keep its addresses up to date).
 */
class AccountAddressRequest extends AddressRequest
{
    public function authorize(): bool
    {
        return $this->user()?->customer?->isApproved() ?? false;
    }
}
