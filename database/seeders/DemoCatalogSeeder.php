<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\ProductAttribute;
use App\Models\ProductImage;
use App\Models\Promotion;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Generates deterministic, idempotent demo data not present in the catalog JSONs:
 * category placeholder images, generic product specifications, and active demo promotions.
 */
class DemoCatalogSeeder extends Seeder
{
    private const int IMAGES_PER_PRODUCT = 3;

    private const int DEMO_PROMOTION_LIMIT = 8;

    /** @var list<int> */
    private const array DEMO_DISCOUNT_PERCENTS = [5, 10, 15, 20];

    public function run(): void
    {
        DB::transaction(function (): void {
            /** @var Collection<int, Product> $activeProducts */
            $activeProducts = Product::query()
                ->active()
                ->with('category')
                ->orderBy('id')
                ->get();

            $this->seedImages($activeProducts);
            $this->seedAttributes($activeProducts);
            $this->seedDemoPromotions();
        });
    }

    /**
     * @param  Collection<int, Product>  $products
     */
    private function seedImages(Collection $products): void
    {
        if ($products->isEmpty()) {
            return;
        }

        /** @var Collection<string, ProductImage> $existing */
        $existing = ProductImage::query()
            ->whereIn('product_id', $products->pluck('id'))
            ->get()
            ->keyBy(fn (ProductImage $image): string => "{$image->product_id}:{$image->position}");

        $now = now();
        $toInsert = [];

        foreach ($products as $product) {
            $categorySlug = $product->category->slug;

            for ($position = 0; $position < self::IMAGES_PER_PRODUCT; $position++) {
                $viewNumber = $position + 1;
                $path = "demo/products/{$categorySlug}-{$viewNumber}.svg";
                $alt = "{$product->name}, vista {$viewNumber}";
                $key = "{$product->id}:{$position}";

                $current = $existing->get($key);

                if ($current === null) {
                    $toInsert[] = [
                        'product_id' => $product->id,
                        'path' => $path,
                        'alt' => $alt,
                        'position' => $position,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                } elseif ($current->path !== $path || $current->alt !== $alt) {
                    $current->update([
                        'path' => $path,
                        'alt' => $alt,
                    ]);
                }
            }
        }

        foreach (array_chunk($toInsert, 200) as $chunk) {
            ProductImage::query()->insert($chunk);
        }
    }

    /**
     * @param  Collection<int, Product>  $products
     */
    private function seedAttributes(Collection $products): void
    {
        if ($products->isEmpty()) {
            return;
        }

        /** @var Collection<string, ProductAttribute> $existing */
        $existing = ProductAttribute::query()
            ->whereIn('product_id', $products->pluck('id'))
            ->get()
            ->keyBy(fn (ProductAttribute $attribute): string => "{$attribute->product_id}:{$attribute->position}");

        $now = now();
        $toInsert = [];

        foreach ($products as $product) {
            $specifications = $this->buildSpecificationsFor($product);

            foreach ($specifications as $position => $spec) {
                $key = "{$product->id}:{$position}";
                $current = $existing->get($key);

                if ($current === null) {
                    $toInsert[] = [
                        'product_id' => $product->id,
                        'name' => $spec['name'],
                        'value' => $spec['value'],
                        'position' => $position,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                } elseif ($current->name !== $spec['name'] || $current->value !== $spec['value']) {
                    $current->update([
                        'name' => $spec['name'],
                        'value' => $spec['value'],
                    ]);
                }
            }
        }

        foreach (array_chunk($toInsert, 200) as $chunk) {
            ProductAttribute::query()->insert($chunk);
        }
    }

    /**
     * @return list<array{name: string, value: string}>
     */
    private function buildSpecificationsFor(Product $product): array
    {
        $categoryName = $product->category->name;
        $categorySlug = $product->category->slug;
        $specifications = [];

        if ($product->brand !== null && $product->brand !== '') {
            $specifications[] = ['name' => 'Marca', 'value' => $product->brand];
        } else {
            $specifications[] = ['name' => 'Origem', 'value' => 'Brasil'];
        }

        $specifications[] = ['name' => 'Categoria', 'value' => $categoryName];
        $specifications[] = ['name' => 'EAN', 'value' => $product->ean];
        $specifications[] = ['name' => 'Conteúdo', 'value' => $this->extractContent($product->name)];
        $specifications[] = ['name' => 'Validade', 'value' => $this->shelfLifeForCategory($categorySlug)];

        return $specifications;
    }

    private function extractContent(string $productName): string
    {
        if (preg_match('/\b(\d+(?:[.,]\d+)?\s*(?:ml|l|g|kg|m))\b/iu', $productName, $matches) === 1) {
            return $matches[1];
        }

        return '1 unidade';
    }

    private function shelfLifeForCategory(string $categorySlug): string
    {
        return match ($categorySlug) {
            'frios-e-laticinios' => '45 dias',
            'limpeza', 'higiene' => '24 meses',
            default => '12 meses',
        };
    }

    private function seedDemoPromotions(): void
    {
        $startsOn = now()->subDays(7)->toDateString();
        $endsOn = now()->addDays(60)->toDateString();

        $eligibleProducts = Product::query()
            ->active()
            ->whereHas('stock', fn (Builder $query): Builder => $query->where('quantity', '>', 0))
            ->whereDoesntHave('promotions', fn (Builder $query): Builder => $query->where('is_demo', false))
            ->orderBy('id')
            ->limit(self::DEMO_PROMOTION_LIMIT)
            ->get();

        foreach ($eligibleProducts->values() as $index => $product) {
            $discount = self::DEMO_DISCOUNT_PERCENTS[$index % count(self::DEMO_DISCOUNT_PERCENTS)];

            Promotion::query()->updateOrCreate(
                [
                    'product_id' => $product->id,
                    'is_demo' => true,
                ],
                [
                    'discount_percent' => $discount,
                    'starts_on' => $startsOn,
                    'ends_on' => $endsOn,
                ],
            );
        }
    }
}
