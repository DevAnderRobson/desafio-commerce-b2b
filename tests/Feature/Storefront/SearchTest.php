<?php

use App\Models\Category;
use App\Models\Customer;
use App\Models\PriceTable;
use App\Models\PriceTableItem;
use App\Models\Product;
use App\Models\Stock;
use App\Models\User;
use App\Search\ProductSearch;
use App\Search\SearchFilters;

function catalogProduct(string $name, array $attributes = [], int $stock = 20): Product
{
    $product = Product::factory()->create(['name' => $name, ...$attributes]);
    Stock::factory()->for($product)->create(['quantity' => $stock]);

    return $product;
}

function searchNames(string $term, array $filters = []): array
{
    return app(ProductSearch::class)
        ->query(new SearchFilters(...['term' => $term, ...$filters]))
        ->pluck('products.name')
        ->all();
}

describe('matching', function () {
    it('ignores accents and case', function () {
        catalogProduct('Refrigerante Guaraná São João 350ml');

        expect(searchNames('guarana sao joao'))->toBe(['Refrigerante Guaraná São João 350ml'])
            ->and(searchNames('GUARANÁ'))->toBe(['Refrigerante Guaraná São João 350ml']);
    });

    it('matches plurals and partial words as the user types', function () {
        catalogProduct('Refrigerante Cola 2L');
        catalogProduct('Detergente Neutro 500ml');

        expect(searchNames('refrigerantes'))->toBe(['Refrigerante Cola 2L'])
            ->and(searchNames('refrig'))->toBe(['Refrigerante Cola 2L'])
            ->and(searchNames('deterg neutro'))->toBe(['Detergente Neutro 500ml']);
    });

    it('finds a product by exact SKU or EAN', function () {
        catalogProduct('Produto A', ['sku' => 'SKU-777', 'ean' => '7891234567895']);
        catalogProduct('Produto B', ['sku' => 'SKU-888', 'ean' => '7890000000001']);

        expect(searchNames('sku-777'))->toBe(['Produto A'])
            ->and(searchNames('7890000000001'))->toBe(['Produto B']);
    });

    it('tolerates small typos', function () {
        catalogProduct('Desinfetante Lavanda 500ml');

        expect(searchNames('desinfetnte lavanda'))->toBe(['Desinfetante Lavanda 500ml']);
    });

    it('returns nothing for terms that match nothing', function () {
        catalogProduct('Água Mineral 500ml');

        expect(searchNames('xyzqwerty'))->toBe([]);
    });

    it('treats special characters as plain text, never as query syntax', function (string $term) {
        catalogProduct('Água Mineral 500ml');

        expect(fn () => searchNames($term))->not->toThrow(Throwable::class);
    })->with(["'; drop table products; --", '& | ! ( ) : *', '%_\\', '   ']);

    it('never returns inactive products', function () {
        catalogProduct('Produto Descontinuado', ['is_active' => false]);

        expect(searchNames('descontinuado'))->toBe([]);
    });

    it('puts out-of-stock products after the available ones', function () {
        catalogProduct('Arroz Tipo 1 Sem Estoque', stock: 0);
        catalogProduct('Arroz Tipo 1 Com Estoque');

        expect(searchNames('arroz'))->toBe(['Arroz Tipo 1 Com Estoque', 'Arroz Tipo 1 Sem Estoque']);
    });

    it('ranks the closest name first', function () {
        catalogProduct('Suco de Uva Integral 1L');
        catalogProduct('Uva');
        catalogProduct('Geleia de Uva Orgânica');

        expect(searchNames('uva')[0])->toBe('Uva');
    });
});

describe('filters and facets', function () {
    it('filters by category and brand', function () {
        $drinks = Category::factory()->create(['slug' => 'bebidas', 'name' => 'Bebidas']);
        $cleaning = Category::factory()->create(['slug' => 'limpeza', 'name' => 'Limpeza']);
        catalogProduct('Água A', ['category_id' => $drinks->id, 'brand' => 'Fonte']);
        catalogProduct('Água B', ['category_id' => $drinks->id, 'brand' => 'Outra']);
        catalogProduct('Água Sanitária', ['category_id' => $cleaning->id, 'brand' => 'Fonte']);

        expect(searchNames('água', ['categorySlug' => 'bebidas']))->toHaveCount(2)
            ->and(searchNames('água', ['categorySlug' => 'bebidas', 'brand' => 'Fonte']))->toBe(['Água A'])
            ->and(searchNames('', ['brand' => 'Fonte']))->toHaveCount(2);
    });

    it('counts facets ignoring the facet own filter', function () {
        $drinks = Category::factory()->create(['slug' => 'bebidas', 'name' => 'Bebidas']);
        $cleaning = Category::factory()->create(['slug' => 'limpeza', 'name' => 'Limpeza']);
        catalogProduct('Água A', ['category_id' => $drinks->id, 'brand' => 'Fonte']);
        catalogProduct('Água B', ['category_id' => $drinks->id, 'brand' => 'Outra']);
        catalogProduct('Água Sanitária', ['category_id' => $cleaning->id, 'brand' => 'Fonte']);

        $facets = app(ProductSearch::class)->facets(new SearchFilters(term: 'água', categorySlug: 'bebidas', brand: 'Fonte'));

        expect($facets['categories'])->toBe([
            ['name' => 'Bebidas', 'slug' => 'bebidas', 'count' => 1],
            ['name' => 'Limpeza', 'slug' => 'limpeza', 'count' => 1],
        ])->and($facets['brands'])->toBe([
            ['name' => 'Fonte', 'count' => 1],
            ['name' => 'Outra', 'count' => 1],
        ]);
    });
});

describe('suggestions endpoint', function () {
    it('returns at most five items with the total and no prices', function () {
        $table = PriceTable::factory()->standard()->create();
        foreach (range(1, 7) as $i) {
            $product = catalogProduct("Biscoito Recheado {$i}");
            PriceTableItem::factory()->for($table)->for($product)->create(['price_cents' => 98765]);
        }

        $response = $this->getJson(route('search.suggest', ['q' => 'biscoito']))->assertOk();

        expect($response->json('items'))->toHaveCount(5)
            ->and($response->json('total'))->toBe(7)
            ->and($response->json('query'))->toBe('biscoito')
            ->and($response->json('items.0'))->toHaveKeys(['id', 'name', 'brand', 'slug', 'href', 'categoryName', 'imageUrl', 'imageAlt'])
            ->and($response->getContent())->not->toContain('98765')->not->toContain('price');
    });

    it('answers empty for terms shorter than two characters without querying products', function () {
        catalogProduct('Água');

        $this->getJson(route('search.suggest', ['q' => 'a']))
            ->assertOk()
            ->assertExactJson(['query' => 'a', 'total' => 0, 'items' => []]);
    });

    it('rejects absurdly long terms', function () {
        $this->getJson(route('search.suggest', ['q' => str_repeat('a', 101)]))->assertUnprocessable();
    });
});

describe('results page', function () {
    it('renders paginated results with the requested filters', function () {
        $category = Category::factory()->create(['slug' => 'bebidas', 'name' => 'Bebidas']);
        foreach (range(1, 30) as $i) {
            catalogProduct("Suco {$i}", ['category_id' => $category->id]);
        }

        $this->get(route('search.index', ['q' => 'suco', 'page' => 2]))
            ->assertInertia(fn ($page) => $page
                ->component('store/search')
                ->where('query', 'suco')
                ->where('products.meta.currentPage', 2)
                ->where('products.meta.total', 30)
                ->where('products.meta.lastPage', 2)
                ->has('products.data', 6)
                ->where('facets.categories.0.count', 30));
    });

    it('lists the whole catalog when there is no term', function () {
        catalogProduct('Produto 1');
        catalogProduct('Produto 2');

        $this->get(route('search.index'))->assertInertia(fn ($page) => $page->where('products.meta.total', 2)->where('query', ''));
    });

    it('lists a category page with the category fixed', function () {
        $category = Category::factory()->create(['slug' => 'limpeza', 'name' => 'Limpeza']);
        catalogProduct('Sabão', ['category_id' => $category->id]);
        catalogProduct('Outro Produto');

        $this->get(route('categories.show', $category))->assertInertia(fn ($page) => $page
            ->where('category', ['name' => 'Limpeza', 'slug' => 'limpeza'])
            ->where('products.meta.total', 1)
            ->where('filters.category', null));
    });

    it('returns 404 for an unknown category', function () {
        $this->get('/categorias/nao-existe')->assertNotFound();
    });

    it('rejects an invalid sort option', function () {
        $this->get(route('search.index', ['sort' => 'hack']))->assertSessionHasErrors('sort');
    });

    it('only offers price sorting to approved companies', function () {
        $table = PriceTable::factory()->standard()->create();
        $approved = User::factory()->ownerOf(Customer::factory()->create(['price_table_id' => $table->id]))->create();
        $pending = User::factory()->ownerOf(Customer::factory()->pending()->create(['price_table_id' => $table->id]))->create();

        $this->get(route('search.index'))->assertInertia(fn ($page) => $page->has('sortOptions', 2));
        $this->actingAs($pending)->get(route('search.index', ['sort' => 'price_asc']))
            ->assertInertia(fn ($page) => $page->has('sortOptions', 2)->where('filters.sort', 'relevance'));
        $this->actingAs($approved)->get(route('search.index', ['sort' => 'price_asc']))
            ->assertInertia(fn ($page) => $page->has('sortOptions', 4)->where('filters.sort', 'price_asc'));
    });

    it('sorts by the price of the customer table, missing prices last', function () {
        $table = PriceTable::factory()->standard()->create();
        $cheap = catalogProduct('Item Barato');
        $dear = catalogProduct('Item Caro');
        catalogProduct('Item Sem Preço');
        PriceTableItem::factory()->for($table)->for($cheap)->create(['price_cents' => 100]);
        PriceTableItem::factory()->for($table)->for($dear)->create(['price_cents' => 900]);
        $user = User::factory()->ownerOf(Customer::factory()->create(['price_table_id' => $table->id]))->create();

        $this->actingAs($user)->get(route('search.index', ['q' => 'item', 'sort' => 'price_desc']))
            ->assertInertia(fn ($page) => $page
                ->where('products.data.0.name', 'Item Caro')
                ->where('products.data.1.name', 'Item Barato')
                ->where('products.data.2.name', 'Item Sem Preço'));
    });

    it('does not leak prices to visitors', function () {
        $table = PriceTable::factory()->standard()->create();
        $product = catalogProduct('Item Secreto');
        PriceTableItem::factory()->for($table)->for($product)->create(['price_cents' => 98765]);

        $response = $this->get(route('search.index', ['q' => 'secreto']));

        expect($response->getContent())->not->toContain('98765')->not->toContain('unitPriceCents');
    });

    it('throttles searches', function () {
        foreach (range(1, 120) as $i) {
            $this->getJson(route('search.suggest', ['q' => 'ab']))->assertOk();
        }

        $this->getJson(route('search.suggest', ['q' => 'ab']))->assertTooManyRequests();
    });
});
