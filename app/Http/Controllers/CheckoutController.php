<?php

namespace App\Http\Controllers;

use App\Cart\CartLine;
use App\Cart\CartSummary;
use App\Cart\CartTotals;
use App\Checkout\CheckoutSelection;
use App\Checkout\FreightCalculator;
use App\Checkout\FreightOption;
use App\Checkout\FreightUnavailable;
use App\Http\Requests\PlaceOrderRequest;
use App\Models\Address;
use App\Orders\OrderCannotBePlaced;
use App\Orders\OrderCreator;
use App\Orders\PaymentTermOption;
use App\Orders\PaymentTermOptions;
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
        private PaymentTermOptions $terms,
        private OrderCreator $creator,
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

    public function payment(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        $summary = $this->totals->summarize($user);
        $address = $this->savedAddress($user->customer_id);
        $option = $address === null ? null : $this->savedFreight($address, $summary);

        if ($user->cannot('checkout') || $summary->isEmpty() || $summary->hasIssues()) {
            return to_route('cart.show');
        }

        if ($address === null || $option === null) {
            return to_route('checkout.delivery');
        }

        $terms = array_map(fn (PaymentTermOption $term): array => $term->toArray(), $this->terms->for($user->customer, $summary->subtotalCents, $option->priceCents));
        $firstAvailable = collect($terms)->firstWhere('available', true);

        return Inertia::render('checkout/payment', [
            'summary' => [
                'items' => $this->summary($summary)['items'],
                'count' => $summary->unitCount(),
                'totals' => [
                    'subtotalCents' => $summary->subtotalCents,
                    'savingsCents' => $summary->savingsCents,
                    'shippingCents' => $option->priceCents,
                ],
            ],
            'address' => $this->address($address),
            'freight' => [
                'label' => $option->label,
                'priceCents' => $option->priceCents,
                'deliveryDaysMin' => $option->deliveryDaysMin,
                'deliveryDaysMax' => $option->deliveryDaysMax,
                'isFree' => $option->isFree,
            ],
            'paymentTerms' => $terms,
            'selectedTermCode' => $firstAvailable['code'] ?? null,
            'idempotencyKey' => $this->selection->idempotencyKey(),
            'routes' => [
                'confirm' => route('checkout.place', absolute: false),
                'delivery' => route('checkout.delivery', absolute: false),
                'cart' => route('cart.show', absolute: false),
            ],
        ]);
    }

    public function place(PlaceOrderRequest $request): RedirectResponse
    {
        $user = $request->user();
        $address = $this->savedAddress($user->customer_id);
        $freightCode = $this->selection->freightCode();

        if ($address === null || $freightCode === null) {
            return to_route('checkout.delivery');
        }

        try {
            $order = $this->creator->create($user, $address, $freightCode, $request->string('payment_term_code')->toString(), $request->string('idempotency_key')->toString());
        } catch (OrderCannotBePlaced $exception) {
            throw ValidationException::withMessages([$exception->field => $exception->getMessage()]);
        }

        $this->selection->finish();

        return to_route('orders.processing', $order->number);
    }

    /**
     * Saves the chosen address and freight option and moves on to the payment step.
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

        return to_route('checkout.payment');
    }

    private function savedAddress(?int $customerId): ?Address
    {
        $id = $this->selection->addressId();

        return $id === null ? null : Address::query()->where('customer_id', $customerId)->whereKey($id)->first();
    }

    private function savedFreight(Address $address, CartSummary $summary): ?FreightOption
    {
        $quote = $this->quote($address, $summary);

        return $this->optionByCode($quote['options'], $this->selection->freightCode());
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
