<?php

namespace App\Http\Controllers;

use App\Cart\CartLine;
use App\Cart\CartSummary;
use App\Cart\CartTotals;
use App\Checkout\CheckoutSelection;
use App\Checkout\FreightCalculator;
use App\Checkout\FreightOption;
use App\Checkout\FreightUnavailable;
use App\Models\Address;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CheckoutController extends Controller
{
    public function __construct(
        private CartTotals $totals,
        private FreightCalculator $freight,
        private CheckoutSelection $selection,
    ) {}

    public function delivery(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        $summary = $this->totals->summarize($user);

        if ($user->cannot('checkout') || $summary->isEmpty() || $summary->hasIssues()) {
            return to_route('cart.show');
        }

        $addresses = $this->addresses($user->customer_id);
        $address = $this->selectedAddress($request, $addresses);
        $quote = $address === null ? null : $this->quote($address, $summary);
        $options = $quote['options'] ?? [];
        $freightCode = $this->selectedFreightCode($request, $options);

        if ($request->query('address') !== null || $request->query('freight') !== null) {
            $this->selection->remember($address?->id, $freightCode);
        }

        $chosen = $this->optionByCode($options, $freightCode);
        $withFreight = $this->totals->summarize($user, $chosen === null ? 0 : $chosen->priceCents);

        return Inertia::render('checkout/delivery', [
            'summary' => $this->summary($withFreight),
            'addresses' => array_values($addresses->map(fn (Address $item): array => $this->address($item))->all()),
            'selectedAddressId' => $address?->id,
            'freight' => $quote === null ? null : [
                'options' => array_map(fn (FreightOption $option): array => $option->toArray(), $options),
                'error' => $quote['error'],
            ],
            'selectedFreightCode' => $freightCode,
            'canContinue' => $address !== null && $chosen !== null,
            'routes' => [
                'confirm' => route('checkout.delivery.confirm', absolute: false),
                'addressStore' => route('addresses.store', absolute: false),
                'addressBase' => '/checkout/enderecos',
                'cepLookup' => '/checkout/cep',
                'cart' => route('cart.show', absolute: false),
            ],
        ]);
    }

    /**
     * Saves the chosen address and freight option. The payment step (wave 7) continues from here.
     */
    public function confirm(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->can('checkout'), 403);

        $data = $request->validate([
            'address_id' => ['required', 'integer'],
            'freight_code' => ['required', 'string'],
        ]);

        $address = Address::query()->whereKey($data['address_id'])->firstOrFail();
        abort_unless($address->customer_id === $user->customer_id, 403);

        $summary = $this->totals->summarize($user);
        $quote = $this->quote($address, $summary);
        $valid = collect($quote['options'])->contains(fn (FreightOption $option): bool => $option->code === $data['freight_code']);

        if (! $valid) {
            throw ValidationException::withMessages(['freight_code' => 'Escolha uma opção de frete válida para este endereço.']);
        }

        $address->forceFill(['last_used_at' => now()])->save();
        $this->selection->remember($address->id, $data['freight_code']);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Entrega confirmada. O pagamento será liberado na próxima etapa.']);

        return to_route('checkout.delivery');
    }

    /**
     * @return Collection<int, Address>
     */
    private function addresses(?int $customerId): Collection
    {
        return Address::query()
            ->where('customer_id', $customerId)
            ->orderByRaw('last_used_at desc nulls last')
            ->orderByDesc('id')
            ->get();
    }

    /**
     * @param  Collection<int, Address>  $addresses
     */
    private function selectedAddress(Request $request, Collection $addresses): ?Address
    {
        $requested = $request->query('address');

        if ($requested !== null) {
            $address = $addresses->firstWhere('id', (int) $requested);
            abort_if($address === null, 403);

            return $address;
        }

        return $addresses->firstWhere('id', $this->selection->addressId()) ?? $addresses->first();
    }

    /**
     * @param  list<FreightOption>  $options
     */
    private function optionByCode(array $options, ?string $code): ?FreightOption
    {
        foreach ($options as $option) {
            if ($option->code === $code) {
                return $option;
            }
        }

        return null;
    }

    /**
     * @param  list<FreightOption>  $options
     */
    private function selectedFreightCode(Request $request, array $options): ?string
    {
        $codes = array_map(fn (FreightOption $option): string => $option->code, $options);
        $requested = $request->query('freight');

        foreach ([is_string($requested) ? $requested : null, $this->selection->freightCode()] as $candidate) {
            if ($candidate !== null && in_array($candidate, $codes, true)) {
                return $candidate;
            }
        }

        return $codes[0] ?? null;
    }

    /**
     * @return array{options: list<FreightOption>, error: string|null}
     */
    private function quote(Address $address, CartSummary $summary): array
    {
        try {
            return ['options' => $this->freight->options($address, $summary->subtotalCents, $summary->unitCount()), 'error' => null];
        } catch (FreightUnavailable) {
            return ['options' => [], 'error' => 'Não foi possível calcular o frete para este endereço.'];
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function summary(CartSummary $summary): array
    {
        return [
            'items' => array_map(function (CartLine $line): array {
                $product = $line->item->product;
                $image = $product->images->first();

                return [
                    'id' => $line->item->id,
                    'name' => $product->name,
                    'href' => '/produtos/'.$product->slug,
                    'imageUrl' => $image !== null ? asset($image->path) : null,
                    'imageAlt' => $image !== null ? $image->alt : $product->name,
                    'quantity' => $line->item->quantity,
                    'unitPriceCents' => $line->quote->unitPriceCents,
                    'lineTotalCents' => $line->totalCents(),
                ];
            }, $summary->lines),
            'count' => $summary->unitCount(),
            'totals' => [
                'subtotalCents' => $summary->subtotalCents,
                'savingsCents' => $summary->savingsCents,
                'shippingCents' => $summary->shippingCents,
                'surchargeCents' => $summary->surchargeCents,
                'totalCents' => $summary->totalCents,
            ],
            'freeShippingMissingCents' => $this->freight->freeShippingMissingCents($summary->subtotalCents),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function address(Address $address): array
    {
        return [
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
        ];
    }
}
