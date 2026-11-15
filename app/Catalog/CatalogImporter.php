<?php

namespace App\Catalog;

use App\Enums\ApprovalStatus;
use App\Models\Category;
use App\Models\Customer;
use App\Models\PaymentTerm;
use App\Models\PriceTable;
use App\Models\PriceTableItem;
use App\Models\Product;
use App\Models\Promotion;
use App\Models\Stock;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use JsonException;

/**
 * Loads the catalog JSON files into the database. Idempotent: running it again updates
 * existing rows instead of duplicating them. The database is the only source of truth
 * afterwards; the application never reads these files at runtime.
 */
class CatalogImporter
{
    private const FILES = [
        'produtos.json',
        'estoque.json',
        'tabelas_preco.json',
        'clientes.json',
        'promocoes.json',
        'condicoes_pagamento.json',
    ];

    public function import(string $directory): ImportReport
    {
        $data = $this->readAll($directory);
        $report = new ImportReport;

        DB::transaction(function () use ($data, $report): void {
            $productIds = $this->importProducts($data['produtos.json'], $report);
            $this->importStocks($data['estoque.json'], $productIds, $report);
            $priceTableIds = $this->importPriceTables($data['tabelas_preco.json'], $productIds, $report);
            $this->importCustomers($data['clientes.json'], $priceTableIds, $report);
            $this->importPromotions($data['promocoes.json'], $productIds, $report);
            $this->importPaymentTerms($data['condicoes_pagamento.json'], $report);
            $this->resetSequences();
        });

        return $report;
    }

    /**
     * @return array<string, list<array<string, mixed>>>
     */
    private function readAll(string $directory): array
    {
        $data = [];

        foreach (self::FILES as $file) {
            $data[$file] = $this->readFile(rtrim($directory, '/').'/'.$file);
        }

        return $data;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function readFile(string $path): array
    {
        if (! is_file($path)) {
            throw InvalidCatalogData::missingFile($path);
        }

        try {
            $decoded = json_decode((string) file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw InvalidCatalogData::malformedFile($path, $exception->getMessage());
        }

        if (! is_array($decoded) || ! array_is_list($decoded)) {
            throw InvalidCatalogData::malformedFile($path, 'expected a JSON list');
        }

        /** @var list<array<string, mixed>> $decoded */
        return $decoded;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array<int, true> product ids present in the database after the import
     */
    private function importProducts(array $rows, ImportReport $report): array
    {
        $categoryIds = [];
        $products = [];
        $seenSkus = [];

        foreach ($rows as $row) {
            if (! isset($row['id'], $row['sku'], $row['ean'], $row['nome'], $row['categoria'])) {
                $report->warn('Product skipped: missing required fields ('.json_encode($row).')');

                continue;
            }

            if (isset($seenSkus[$row['sku']])) {
                $report->warn("Product {$row['id']} skipped: duplicated SKU {$row['sku']}");

                continue;
            }
            $seenSkus[$row['sku']] = true;

            $categorySlug = Str::slug((string) $row['categoria']);
            $categoryIds[$categorySlug] ??= Category::query()->updateOrCreate(
                ['slug' => $categorySlug],
                ['name' => (string) $row['categoria']],
            )->id;

            $products[] = [
                'id' => (int) $row['id'],
                'sku' => (string) $row['sku'],
                'ean' => (string) $row['ean'],
                'name' => (string) $row['nome'],
                'slug' => Str::slug((string) $row['nome']).'-'.$row['id'],
                'description' => $row['descricao'] ?? null,
                'brand' => $row['marca'] ?? null,
                'category_id' => $categoryIds[$categorySlug],
                'is_active' => (bool) ($row['ativo'] ?? true),
            ];
        }

        foreach (array_chunk($products, 200) as $chunk) {
            Product::query()->upsert(
                $chunk,
                ['id'],
                ['sku', 'ean', 'name', 'slug', 'description', 'brand', 'category_id', 'is_active'],
            );
        }

        $report->count('categories', count($categoryIds));
        $report->count('products', count($products));

        return array_fill_keys(array_column($products, 'id'), true);
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @param  array<int, true>  $productIds
     */
    private function importStocks(array $rows, array $productIds, ImportReport $report): void
    {
        $stocks = [];

        foreach ($rows as $row) {
            $productId = (int) ($row['produto_id'] ?? 0);

            if (! isset($productIds[$productId])) {
                $report->warn("Stock ignored: product {$productId} does not exist");

                continue;
            }

            $stocks[$productId] = ['product_id' => $productId, 'quantity' => max(0, (int) ($row['quantidade'] ?? 0))];
        }

        foreach (array_diff_key($productIds, $stocks) as $productId => $unused) {
            $report->warn("Product {$productId} has no stock record; stock set to 0");
            $stocks[$productId] = ['product_id' => $productId, 'quantity' => 0];
        }

        foreach (array_chunk(array_values($stocks), 200) as $chunk) {
            Stock::query()->upsert($chunk, ['product_id'], ['quantity']);
        }

        $report->count('stocks', count($stocks));
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @param  array<int, true>  $productIds
     * @return array<string, int> price table ids keyed by code
     */
    private function importPriceTables(array $rows, array $productIds, ImportReport $report): array
    {
        $priceTableIds = [];

        foreach ($rows as $row) {
            if (! isset($row['codigo'])) {
                $report->warn('Price table skipped: missing code');

                continue;
            }

            $table = PriceTable::query()->updateOrCreate(
                ['code' => (string) $row['codigo']],
                ['description' => (string) ($row['descricao'] ?? $row['codigo'])],
            );
            $priceTableIds[$table->code] = $table->id;

            $items = [];
            $withoutPrice = $productIds;

            foreach ($row['itens'] ?? [] as $item) {
                $productId = (int) ($item['produto_id'] ?? 0);

                if (! isset($productIds[$productId])) {
                    $report->warn("Price table {$table->code}: product {$productId} does not exist");

                    continue;
                }

                unset($withoutPrice[$productId]);
                $items[] = [
                    'price_table_id' => $table->id,
                    'product_id' => $productId,
                    'price_cents' => $this->toCents($item['preco'] ?? 0),
                    'wholesale_price_cents' => isset($item['preco_atacado']) ? $this->toCents($item['preco_atacado']) : null,
                    'wholesale_min_quantity' => isset($item['preco_atacado']) ? (int) ($item['qtd_minima_atacado'] ?? 0) : null,
                ];
            }

            foreach (array_chunk($items, 200) as $chunk) {
                PriceTableItem::query()->upsert(
                    $chunk,
                    ['price_table_id', 'product_id'],
                    ['price_cents', 'wholesale_price_cents', 'wholesale_min_quantity'],
                );
            }

            if ($withoutPrice !== []) {
                $report->warn("Price table {$table->code}: ".count($withoutPrice).' products have no price (unavailable for this table)');
            }

            $report->count('price_table_items', count($items));
        }

        $report->count('price_tables', count($priceTableIds));

        return $priceTableIds;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @param  array<string, int>  $priceTableIds
     */
    private function importCustomers(array $rows, array $priceTableIds, ImportReport $report): void
    {
        $customers = [];

        foreach ($rows as $row) {
            if (! isset($row['id'], $row['cnpj'], $row['razao_social'])) {
                $report->warn('Customer skipped: missing required fields');

                continue;
            }

            $tableCode = (string) ($row['tabela_preco'] ?? '');

            if (! isset($priceTableIds[$tableCode])) {
                $report->warn("Customer {$row['id']}: price table '{$tableCode}' does not exist");
            }

            $customers[] = [
                'id' => (int) $row['id'],
                'cnpj' => (string) $row['cnpj'],
                'legal_name' => (string) $row['razao_social'],
                'trade_name' => $row['nome_fantasia'] ?? null,
                'city' => $row['cidade'] ?? null,
                'state' => $row['uf'] ?? null,
                'price_table_id' => $priceTableIds[$tableCode] ?? null,
                'credit_limit_cents' => $this->toCents($row['limite_credito'] ?? 0),
                'credit_used_cents' => $this->toCents($row['limite_utilizado'] ?? 0),
                'is_blocked' => (bool) ($row['bloqueado'] ?? false),
                'approval_status' => ApprovalStatus::Approved->value,
                'approved_at' => now(),
            ];
        }

        // Approval status and used credit are only set on first insert, so re-importing
        // never undoes decisions or consumption recorded after the initial load.
        Customer::query()->upsert(
            $customers,
            ['id'],
            ['cnpj', 'legal_name', 'trade_name', 'city', 'state', 'price_table_id', 'credit_limit_cents', 'is_blocked'],
        );

        $report->count('customers', count($customers));
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @param  array<int, true>  $productIds
     */
    private function importPromotions(array $rows, array $productIds, ImportReport $report): void
    {
        $promotions = [];

        foreach ($rows as $row) {
            $productId = (int) ($row['produto_id'] ?? 0);

            if (! isset($row['id'], $row['percentual_desconto'], $row['inicio'], $row['fim'])) {
                $report->warn('Promotion skipped: missing required fields');

                continue;
            }

            if (! isset($productIds[$productId])) {
                $report->warn("Promotion {$row['id']} ignored: product {$productId} does not exist");

                continue;
            }

            $promotions[] = [
                'id' => (int) $row['id'],
                'product_id' => $productId,
                'discount_percent' => $row['percentual_desconto'],
                'starts_on' => $row['inicio'],
                'ends_on' => $row['fim'],
                'is_demo' => false,
            ];
        }

        Promotion::query()->upsert($promotions, ['id'], ['product_id', 'discount_percent', 'starts_on', 'ends_on']);

        $report->count('promotions', count($promotions));
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     */
    private function importPaymentTerms(array $rows, ImportReport $report): void
    {
        $terms = [];

        foreach ($rows as $row) {
            if (! isset($row['codigo'])) {
                $report->warn('Payment term skipped: missing code');

                continue;
            }

            $terms[] = [
                'code' => (string) $row['codigo'],
                'description' => (string) ($row['descricao'] ?? $row['codigo']),
                'minimum_amount_cents' => $this->toCents($row['valor_minimo'] ?? 0),
                'surcharge_percent' => $row['acrescimo_percentual'] ?? 0,
                'is_deferred' => (bool) ($row['a_prazo'] ?? false),
            ];
        }

        PaymentTerm::query()->upsert($terms, ['code'], ['description', 'minimum_amount_cents', 'surcharge_percent', 'is_deferred']);

        $report->count('payment_terms', count($terms));
    }

    private function toCents(mixed $amount): int
    {
        return (int) round(((float) $amount) * 100);
    }

    /**
     * Rows are inserted with explicit ids, so the PostgreSQL sequences must catch up.
     */
    private function resetSequences(): void
    {
        foreach (['products', 'customers', 'promotions'] as $table) {
            DB::statement("SELECT setval(pg_get_serial_sequence('{$table}', 'id'), COALESCE((SELECT MAX(id) FROM {$table}), 1))");
        }
    }
}
