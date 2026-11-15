import type { HomeProduct } from '@/types/home';

/**
 * Contratos da busca. Produzidos por `App\Http\Controllers\SearchController`.
 * Sugestões NUNCA trazem preço; a página de resultados usa o mesmo formato de card da home.
 */
export type SearchSuggestion = {
    id: number;
    name: string;
    brand: string;
    slug: string;
    href: string;
    categoryName: string;
    imageUrl: string | null;
    imageAlt: string;
};

/** Resposta JSON de `search.suggest` (GET /buscar/sugestoes?q=...): no máximo 5 itens. */
export type SuggestResponse = {
    query: string;
    items: SearchSuggestion[];
    /** Total de produtos que casam com a busca (pode ser > items.length). */
    total: number;
};

export type SearchSortKey = 'relevance' | 'name' | 'price_asc' | 'price_desc';

export type SearchSortOption = {
    value: SearchSortKey;
    label: string;
};

export type SearchFacetCategory = { name: string; slug: string; count: number };
export type SearchFacetBrand = { name: string; count: number };

/** Props da página Inertia `store/search` (rotas `search.index` e `categories.show`). */
export type SearchPageProps = {
    /** Termo digitado ('' na listagem por categoria). */
    query: string;
    /** Categoria fixa quando a rota é /categorias/{slug}; senão null. */
    category: { name: string; slug: string } | null;
    products: {
        data: HomeProduct[];
        meta: {
            currentPage: number;
            lastPage: number;
            perPage: number;
            total: number;
            from: number | null;
            to: number | null;
        };
        links: { prev: string | null; next: string | null };
    };
    filters: {
        /** slug da categoria selecionada (filtro) ou null */
        category: string | null;
        brand: string | null;
        sort: SearchSortKey;
    };
    facets: {
        categories: SearchFacetCategory[];
        brands: SearchFacetBrand[];
    };
    /** Só empresa aprovada pode ordenar por preço. */
    sortOptions: SearchSortOption[];
};
