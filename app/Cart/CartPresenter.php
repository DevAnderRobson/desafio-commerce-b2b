<?php

namespace App\Cart;

use App\Models\User;
use App\Pricing\PriceResolver;
use Illuminate\Support\Facades\Gate;

/**
 * Props of the cart page (contract: resources/js/types/cart.ts). Also stores what the user just
 * saw, so the next visit can warn about price or stock changes.
 */
class CartPresenter
{
    public function __construct(
        private CartTotals $totals,
        private PriceResolver $prices,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function present(User $user): array
    {
        $summary = $this->totals->summarize($user);
        $blockers = $this->blockers($user, $summary);

        $items = array_map(fn (CartLine $line): array => $this->item($line, $user), $summary->lines);

        foreach ($summary->lines as $line) {
            if ($line->isValid()) {
                $line->item->forceFill([
                    'seen_unit_price_cents' => $line->quote->unitPriceCents,
                    'seen_available_quantity' => $line->available,
                ])->saveQuietly();
            }
        }

        return [
            'items' => $items,
            'count' => $summary->unitCount(),
            'totals' => [
                'subtotalCents' => $summary->subtotalCents,
                'savingsCents' => $summary->savingsCents,
                'shippingCents' => $summary->shippingCents,
                'surchargeCents' => $summary->surchargeCents,
                'totalCents' => $summary->totalCents,
            ],
            'canProceed' => ! $summary->isEmpty() && $blockers === [],
            'blockers' => $blockers,
        ];
    }

    /**
     * @return list<array{type: string, message: string}>
     */
    private function blockers(User $user, CartSummary $summary): array
    {
        $blockers = [];

        if ($summary->hasIssues()) {
            $blockers[] = ['type' => 'item_issue', 'message' => 'Há itens indisponíveis no carrinho. Ajuste ou remova-os para continuar.'];
        }

        $customer = $user->customer;

        if ($customer === null || ! $customer->isApproved()) {
            $blockers[] = ['type' => 'customer_not_approved', 'message' => 'Seu cadastro ainda está em análise. A compra será liberada após a aprovação.'];
        } elseif (! Gate::forUser($user)->allows('checkout')) {
            $blockers[] = ['type' => 'customer_blocked', 'message' => 'A compra está bloqueada para a sua empresa. Entre em contato com a loja para regularizar.'];
        }

        return $blockers;
    }

    /**
     * @return array<string, mixed>
     */
    private function item(CartLine $line, User $user): array
    {
        $item = $line->item;
        $product = $item->product;
        $quote = $line->quote;
        $image = $product->images->first();

        $hasPromotion = $quote->promotionPercent !== null;
        $priceSource = match (true) {
            $quote->wholesaleApplied && $hasPromotion => 'wholesale_promotion',
            $quote->wholesaleApplied => 'wholesale',
            $hasPromotion => 'promotion',
            default => 'table',
        };

        return [
            'id' => $item->id,
            'productId' => $product->id,
            'name' => $product->name,
            'brand' => $product->brand ?? '',
            'sku' => $product->sku,
            'href' => '/produtos/'.$product->slug,
            'imageUrl' => $image !== null ? asset($image->path) : null,
            'imageAlt' => $image !== null ? $image->alt : $product->name,
            'quantity' => $item->quantity,
            'maxQuantity' => $line->available,
            'unitPriceCents' => $quote->unitPriceCents,
            'listUnitPriceCents' => $quote->listUnitPriceCents,
            'lineTotalCents' => $line->totalCents(),
            'priceSource' => $priceSource,
            'promotionPercent' => $hasPromotion ? (float) $quote->promotionPercent : null,
            'wholesaleHint' => $this->wholesaleHint($line, $user),
            'issue' => $line->issue?->value,
            'issueMessage' => $line->issue?->message($line->available),
            'changeNotice' => $line->isValid() ? $this->changeNotice($line) : null,
        ];
    }

    /**
     * @return array{missingUnits: int, unitPriceCents: int}|null
     */
    private function wholesaleHint(CartLine $line, User $user): ?array
    {
        $quote = $line->quote;

        if (! $line->isValid() || $quote->wholesaleApplied || $quote->wholesaleMinQuantity === null) {
            return null;
        }

        $atMinimum = $this->prices->resolve($user->customer, $line->item->product, $quote->wholesaleMinQuantity);

        return [
            'missingUnits' => $quote->wholesaleMinQuantity - $line->item->quantity,
            'unitPriceCents' => $atMinimum->unitPriceCents,
        ];
    }

    private function changeNotice(CartLine $line): ?string
    {
        $item = $line->item;
        $notices = [];

        if ($item->seen_unit_price_cents !== null && $item->seen_unit_price_cents !== $line->quote->unitPriceCents) {
            $notices[] = 'O preço deste item mudou desde a sua última visita.';
        }

        if ($item->seen_available_quantity !== null && $line->available < $item->seen_available_quantity) {
            $notices[] = 'O estoque deste item diminuiu desde a sua última visita.';
        }

        return $notices === [] ? null : implode(' ', $notices);
    }
}
