<?php

namespace App\Http\Controllers\Account;

use App\Checkout\CheckoutSelection;
use App\Http\Controllers\Controller;
use App\Http\Requests\Account\AccountAddressRequest;
use App\Models\Address;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AddressController extends Controller
{
    public function index(Request $request): Response
    {
        $addresses = Address::query()
            ->where('customer_id', $request->user()->customer_id)
            ->orderByRaw('last_used_at desc nulls last')
            ->orderByDesc('id')
            ->get();

        return Inertia::render('account/addresses', [
            'addresses' => array_values($addresses->map(fn (Address $address): array => [
                'id' => $address->id,
                'label' => $address->label,
                'cep' => $address->formattedCep(),
                'street' => $address->street,
                'number' => $address->number,
                'complement' => $address->complement,
                'neighborhood' => $address->neighborhood,
                'city' => $address->city,
                'state' => $address->state,
                'lastUsedAt' => $address->last_used_at?->toIso8601String(),
            ])->all()),
            'routes' => [
                'store' => route('account.addresses.store', absolute: false),
                'base' => '/conta/enderecos',
                'cepLookup' => '/checkout/cep',
            ],
        ]);
    }

    public function store(AccountAddressRequest $request): RedirectResponse
    {
        Address::query()->create([...$request->validated(), 'customer_id' => $request->user()->customer_id]);

        return to_route('account.addresses.index');
    }

    public function update(AccountAddressRequest $request, Address $address): RedirectResponse
    {
        $this->authorizeAddress($request, $address);
        $address->update($request->validated());

        return to_route('account.addresses.index');
    }

    public function destroy(Request $request, Address $address, CheckoutSelection $selection): RedirectResponse
    {
        abort_unless($request->user()->customer?->isApproved() ?? false, 403);
        $this->authorizeAddress($request, $address);

        $selection->forgetAddress($address->id);
        $address->delete();

        return to_route('account.addresses.index');
    }

    private function authorizeAddress(Request $request, Address $address): void
    {
        abort_unless($address->customer_id === $request->user()->customer_id, 403);
    }
}
