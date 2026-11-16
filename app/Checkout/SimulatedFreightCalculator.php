<?php

namespace App\Checkout;

use App\Models\Address;

/**
 * Simulated freight (D12): price by region of the destination state plus a share of the
 * subtotal; the economic option is free above a configured subtotal.
 */
class SimulatedFreightCalculator implements FreightCalculator
{
    private const ECONOMIC = 'economic';

    private const EXPRESS = 'express';

    /**
     * Base prices (cents) and delivery days (business days) per region.
     *
     * @var array<string, array{economic: array{int, int, int}, express: array{int, int, int}, states: list<string>}>
     */
    private const REGIONS = [
        'south' => ['states' => ['PR', 'SC', 'RS'], 'economic' => [1800, 2, 4], 'express' => [3200, 1, 2]],
        'southeast' => ['states' => ['SP', 'RJ', 'MG', 'ES'], 'economic' => [2400, 3, 5], 'express' => [3800, 1, 3]],
        'other' => ['states' => ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'GO', 'MA', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'RN', 'RO', 'RR', 'SE', 'TO'], 'economic' => [4200, 5, 9], 'express' => [7200, 3, 5]],
    ];

    public function options(Address $address, int $subtotalCents, int $unitCount): array
    {
        $region = $this->regionFor($address->state);

        if ($region === null) {
            throw new FreightUnavailable("Estado sem cobertura de frete: {$address->state}");
        }

        $surcharge = intdiv($subtotalCents * (int) config('shop.freight.subtotal_surcharge_bps') + 5_000, 10_000);
        $isFree = $this->freeShippingMissingCents($subtotalCents) === null && $this->hasFreeShippingRule();

        [$economicBase, $economicMin, $economicMax] = $region['economic'];
        [$expressBase, $expressMin, $expressMax] = $region['express'];

        return [
            new FreightOption(self::ECONOMIC, 'Econômica', $isFree ? 0 : $economicBase + $surcharge, $economicMin, $economicMax, $isFree),
            new FreightOption(self::EXPRESS, 'Expressa', $expressBase + $surcharge, $expressMin, $expressMax),
        ];
    }

    public function freeShippingMissingCents(int $subtotalCents): ?int
    {
        $threshold = (int) config('shop.freight.free_shipping_threshold_cents');

        return $this->hasFreeShippingRule() && $subtotalCents < $threshold ? $threshold - $subtotalCents : null;
    }

    private function hasFreeShippingRule(): bool
    {
        return (int) config('shop.freight.free_shipping_threshold_cents') > 0;
    }

    /**
     * @return array{economic: array{int, int, int}, express: array{int, int, int}, states: list<string>}|null
     */
    private function regionFor(string $state): ?array
    {
        foreach (self::REGIONS as $region) {
            if (in_array(strtoupper($state), $region['states'], true)) {
                return $region;
            }
        }

        return null;
    }
}
