<?php

namespace App\Http\Controllers;

use App\Checkout\CheckoutSelection;
use App\Http\Requests\AddressRequest;
use App\Models\Address;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AddressController extends Controller
{
    public function store(AddressRequest $request): RedirectResponse
    {
        $address = Address::query()->create([...$request->validated(), 'customer_id' => $request->user()->customer_id]);

        return to_route('checkout.delivery', ['address' => $address->id]);
    }

    public function update(AddressRequest $request, Address $address): RedirectResponse
    {
        $this->authorizeAddress($request, $address);
        $address->update($request->validated());

        return to_route('checkout.delivery', ['address' => $address->id]);
    }

    public function destroy(Request $request, Address $address, CheckoutSelection $selection): RedirectResponse
    {
        abort_unless($request->user()->can('checkout'), 403);
        $this->authorizeAddress($request, $address);

        $selection->forgetAddress($address->id);
        $address->delete();

        return to_route('checkout.delivery');
    }

    private function authorizeAddress(Request $request, Address $address): void
    {
        abort_unless($address->customer_id === $request->user()->customer_id, 403);
    }
}
