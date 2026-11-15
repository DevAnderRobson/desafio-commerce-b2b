import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    SearchX,
    SlidersHorizontal,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useId, useState } from 'react';
import { StoreButton } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ProductCard } from '@/components/product-card';
import { ProductGridSkeleton } from '@/components/product-card-skeleton';
import { Label } from '@/components/ui/label';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import categoriesRoutes from '@/routes/categories';
import searchRoutes from '@/routes/search';
import type {
    SearchFacetBrand,
    SearchFacetCategory,
    SearchPageProps,
    SearchSortKey,
} from '@/types/search';

type FilterOverrides = {
    q?: string | null;
    category?: string | null;
    brand?: string | null;
    sort?: SearchSortKey | null;
    page?: number | null;
};

type SearchFiltersPanelProps = {
    isCategoryRoute: boolean;
    fixedCategory: { name: string; slug: string } | null;
    selectedCategory: string | null;
    selectedBrand: string | null;
    categories: SearchFacetCategory[];
    brands: SearchFacetBrand[];
    hasActiveFilters: boolean;
    onSelectCategory: (slug: string | null) => void;
    onSelectBrand: (brand: string | null) => void;
    onClearFilters: () => void;
};

function SearchFiltersPanel({
    isCategoryRoute,
    fixedCategory,
    selectedCategory,
    selectedBrand,
    categories,
    brands,
    hasActiveFilters,
    onSelectCategory,
    onSelectBrand,
    onClearFilters,
}: SearchFiltersPanelProps) {
    const otherCategories = isCategoryRoute
        ? categories.filter((item) => item.slug !== fixedCategory?.slug)
        : categories;

    return (
        <div className="flex flex-col gap-6">
            {hasActiveFilters && (
                <div className="flex items-center justify-between gap-2 border-b border-border pb-4">
                    <span className="text-xs font-medium text-muted-foreground">
                        Refinamento aplicado
                    </span>
                    <button
                        type="button"
                        onClick={onClearFilters}
                        className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-foreground underline-offset-4 hover:underline focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                        Limpar filtros
                    </button>
                </div>
            )}

            {/* Filtro de categoria: exibido apenas quando NÃO está na rota fixa de categoria */}
            {!isCategoryRoute && categories.length > 0 && (
                <section
                    aria-labelledby="filter-categories-heading"
                    className="flex flex-col gap-2.5"
                >
                    <h2
                        id="filter-categories-heading"
                        className="text-sm font-semibold tracking-tight text-foreground"
                    >
                        Categorias
                    </h2>
                    <ul className="flex flex-col gap-1">
                        <li>
                            <button
                                type="button"
                                onClick={() => onSelectCategory(null)}
                                aria-pressed={selectedCategory === null}
                                className={cn(
                                    'flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none',
                                    selectedCategory === null
                                        ? 'bg-secondary font-semibold text-foreground'
                                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                                )}
                            >
                                <span>Todas as categorias</span>
                            </button>
                        </li>
                        {categories.map((facet) => {
                            const active = selectedCategory === facet.slug;

                            return (
                                <li key={facet.slug}>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onSelectCategory(
                                                active ? null : facet.slug,
                                            )
                                        }
                                        aria-pressed={active}
                                        className={cn(
                                            'flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none',
                                            active
                                                ? 'bg-secondary font-semibold text-foreground'
                                                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                                        )}
                                    >
                                        <span className="truncate">
                                            {facet.name}
                                        </span>
                                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                                            ({facet.count})
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            {/* Filtro de marcas */}
            {brands.length > 0 && (
                <section
                    aria-labelledby="filter-brands-heading"
                    className="flex flex-col gap-2.5"
                >
                    <h2
                        id="filter-brands-heading"
                        className="text-sm font-semibold tracking-tight text-foreground"
                    >
                        Marcas
                    </h2>
                    <ul className="flex flex-col gap-1">
                        <li>
                            <button
                                type="button"
                                onClick={() => onSelectBrand(null)}
                                aria-pressed={selectedBrand === null}
                                className={cn(
                                    'flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none',
                                    selectedBrand === null
                                        ? 'bg-secondary font-semibold text-foreground'
                                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                                )}
                            >
                                <span>Todas as marcas</span>
                            </button>
                        </li>
                        {brands.map((facet) => {
                            const active = selectedBrand === facet.name;

                            return (
                                <li key={facet.name}>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onSelectBrand(
                                                active ? null : facet.name,
                                            )
                                        }
                                        aria-pressed={active}
                                        className={cn(
                                            'flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none',
                                            active
                                                ? 'bg-secondary font-semibold text-foreground'
                                                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                                        )}
                                    >
                                        <span className="truncate">
                                            {facet.name}
                                        </span>
                                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                                            ({facet.count})
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            {/* Na rota de categoria, lista as outras categorias como navegação secundária */}
            {isCategoryRoute && otherCategories.length > 0 && (
                <nav
                    aria-labelledby="other-categories-heading"
                    className="flex flex-col gap-2.5 border-t border-border pt-5"
                >
                    <h2
                        id="other-categories-heading"
                        className="text-sm font-semibold tracking-tight text-foreground"
                    >
                        Outros departamentos
                    </h2>
                    <ul className="flex flex-col gap-1">
                        {otherCategories.map((facet) => (
                            <li key={facet.slug}>
                                <Link
                                    href={categoriesRoutes.show.url(facet.slug)}
                                    className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors duration-150 ease-out hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
                                >
                                    <span className="truncate">
                                        {facet.name}
                                    </span>
                                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                                        ({facet.count})
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            )}
        </div>
    );
}

export default function StoreSearchPage({
    query,
    category,
    products,
    filters,
    facets,
    sortOptions,
}: SearchPageProps) {
    const sortSelectId = useId();
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);

    const isCategoryRoute = category !== null;
    const trimmedQuery = query.trim();

    useEffect(() => {
        const removeStart = router.on('start', () => {
            setIsNavigating(true);
        });
        const removeFinish = router.on('finish', () => {
            setIsNavigating(false);
        });

        return () => {
            removeStart();
            removeFinish();
        };
    }, []);

    const buildResultsUrl = useCallback(
        (overrides: FilterOverrides = {}): string => {
            const nextQuery =
                overrides.q !== undefined ? overrides.q : trimmedQuery;
            const nextCategory =
                overrides.category !== undefined
                    ? overrides.category
                    : filters.category;
            const nextBrand =
                overrides.brand !== undefined ? overrides.brand : filters.brand;
            const nextSort =
                overrides.sort !== undefined ? overrides.sort : filters.sort;
            const nextPage =
                overrides.page !== undefined ? overrides.page : null;

            const queryParamsObj: Record<string, string | number | undefined> =
                {
                    q: nextQuery ? nextQuery : undefined,
                    category:
                        !isCategoryRoute && nextCategory
                            ? nextCategory
                            : undefined,
                    brand: nextBrand ? nextBrand : undefined,
                    sort:
                        nextSort && nextSort !== 'relevance'
                            ? nextSort
                            : undefined,
                    page: nextPage && nextPage > 1 ? nextPage : undefined,
                };

            if (isCategoryRoute && category) {
                return categoriesRoutes.show.url(category.slug, {
                    query: queryParamsObj,
                });
            }

            return searchRoutes.index.url({
                query: queryParamsObj,
            });
        },
        [
            category,
            filters.brand,
            filters.category,
            filters.sort,
            isCategoryRoute,
            trimmedQuery,
        ],
    );

    const applyFilterChange = useCallback(
        (
            overrides: FilterOverrides,
            options: { preserveScroll?: boolean; closeDrawer?: boolean } = {},
        ) => {
            const { preserveScroll = true, closeDrawer = false } = options;

            if (closeDrawer) {
                setMobileFiltersOpen(false);
            }

            const targetUrl = buildResultsUrl({
                ...overrides,
                page: overrides.page ?? null,
            });

            router.get(
                targetUrl,
                {},
                {
                    preserveState: true,
                    preserveScroll,
                },
            );
        },
        [buildResultsUrl],
    );

    const handleSelectCategory = useCallback(
        (slug: string | null) => {
            applyFilterChange({ category: slug }, { closeDrawer: true });
        },
        [applyFilterChange],
    );

    const handleSelectBrand = useCallback(
        (brand: string | null) => {
            applyFilterChange({ brand }, { closeDrawer: true });
        },
        [applyFilterChange],
    );

    const handleSortChange = useCallback(
        (nextSort: SearchSortKey) => {
            applyFilterChange({ sort: nextSort });
        },
        [applyFilterChange],
    );

    const handleClearFilters = useCallback(() => {
        applyFilterChange(
            {
                category: null,
                brand: null,
            },
            { closeDrawer: true },
        );
    }, [applyFilterChange]);

    const selectedCategoryFacet =
        !isCategoryRoute && filters.category
            ? facets.categories.find((c) => c.slug === filters.category)
            : null;
    const selectedCategoryLabel =
        selectedCategoryFacet?.name ?? filters.category;

    const hasActiveFilters = Boolean(
        (!isCategoryRoute && filters.category) || filters.brand,
    );
    const activeFilterCount =
        (!isCategoryRoute && filters.category ? 1 : 0) +
        (filters.brand ? 1 : 0);

    const pageHeading = (() => {
        if (isCategoryRoute && category) {
            return trimmedQuery
                ? `${category.name}: resultados para “${trimmedQuery}”`
                : category.name;
        }

        if (trimmedQuery) {
            return `Resultados para “${trimmedQuery}”`;
        }

        if (selectedCategoryLabel) {
            return `Catálogo: ${selectedCategoryLabel}`;
        }

        return 'Catálogo de produtos';
    })();

    const headTitle = (() => {
        if (isCategoryRoute && category) {
            return trimmedQuery
                ? `${category.name} - Busca por ${trimmedQuery}`
                : `${category.name} - Catálogo B2B`;
        }
        return trimmedQuery
            ? `Resultados para "${trimmedQuery}"`
            : 'Busca avançada de produtos';
    })();

    const totalProducts = products.meta.total;
    const totalCountLabel =
        totalProducts === 1
            ? '1 produto encontrado'
            : `${totalProducts} produtos encontrados`;

    return (
        <>
            <Head title={headTitle} />

            <div className="flex flex-col gap-6 lg:gap-8">
                {/* Cabeçalho da página: h1 coerente, contagem anunciada via aria-live e barra de controles */}
                <header className="flex flex-col gap-4 border-b border-border pb-5">
                    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between">
                        <h1 className="font-semibold tracking-tight text-foreground">
                            {pageHeading}
                        </h1>
                        <p
                            role="status"
                            aria-live="polite"
                            aria-atomic="true"
                            className="text-sm font-medium text-muted-foreground tabular-nums"
                        >
                            {totalCountLabel}
                        </p>
                    </div>

                    {/* Controles móveis (Filtros em drawer) + Ordenação */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 lg:hidden">
                            <Sheet
                                open={mobileFiltersOpen}
                                onOpenChange={setMobileFiltersOpen}
                            >
                                <SheetTrigger asChild>
                                    <StoreButton
                                        type="button"
                                        variant="outline"
                                        size="touch"
                                    >
                                        <SlidersHorizontal
                                            className="size-4 shrink-0"
                                            aria-hidden="true"
                                        />
                                        <span>Filtros</span>
                                        {activeFilterCount > 0 && (
                                            <span className="ml-0.5 inline-flex items-center justify-center rounded-sm bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground tabular-nums">
                                                {activeFilterCount}
                                            </span>
                                        )}
                                    </StoreButton>
                                </SheetTrigger>
                                <SheetContent
                                    side="left"
                                    className="flex w-80 max-w-[88vw] flex-col bg-background p-0"
                                >
                                    <SheetHeader className="border-b border-border px-4 py-4 text-left">
                                        <SheetTitle className="text-base font-semibold text-foreground">
                                            Refinar catálogo
                                        </SheetTitle>
                                        <SheetDescription className="text-xs text-muted-foreground">
                                            Filtre os produtos por departamento
                                            ou marca.
                                        </SheetDescription>
                                    </SheetHeader>
                                    <div className="flex-1 overflow-y-auto p-4">
                                        <SearchFiltersPanel
                                            isCategoryRoute={isCategoryRoute}
                                            fixedCategory={category}
                                            selectedCategory={filters.category}
                                            selectedBrand={filters.brand}
                                            categories={facets.categories}
                                            brands={facets.brands}
                                            hasActiveFilters={hasActiveFilters}
                                            onSelectCategory={
                                                handleSelectCategory
                                            }
                                            onSelectBrand={handleSelectBrand}
                                            onClearFilters={handleClearFilters}
                                        />
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>

                        {/* Ordenação sempre com label visível e opções vindas do backend */}
                        {sortOptions.length > 0 && (
                            <div className="ml-auto flex items-center gap-2.5">
                                <Label
                                    htmlFor={sortSelectId}
                                    className="shrink-0 text-sm font-medium text-foreground"
                                >
                                    Ordenar por
                                </Label>
                                <select
                                    id={sortSelectId}
                                    value={filters.sort}
                                    onChange={(event) =>
                                        handleSortChange(
                                            event.target.value as SearchSortKey,
                                        )
                                    }
                                    className="flex min-h-11 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-xs transition-[color,border-color,box-shadow] duration-150 ease-out outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                >
                                    {sortOptions.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Linha de filtros ativos com remoção individual e "Limpar filtros" */}
                    {hasActiveFilters && (
                        <div
                            aria-label="Filtros ativos"
                            className="flex flex-wrap items-center gap-2 pt-1"
                        >
                            <span className="text-xs font-medium text-muted-foreground">
                                Filtros ativos:
                            </span>

                            {!isCategoryRoute && filters.category && (
                                <button
                                    type="button"
                                    onClick={() => handleSelectCategory(null)}
                                    aria-label={`Remover filtro de categoria ${selectedCategoryLabel}`}
                                    className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border bg-secondary/70 px-3 py-1.5 text-xs font-medium text-foreground transition-colors duration-150 ease-out hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
                                >
                                    <span>
                                        Categoria: {selectedCategoryLabel}
                                    </span>
                                    <X
                                        className="size-3.5 text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                </button>
                            )}

                            {filters.brand && (
                                <button
                                    type="button"
                                    onClick={() => handleSelectBrand(null)}
                                    aria-label={`Remover filtro de marca ${filters.brand}`}
                                    className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border bg-secondary/70 px-3 py-1.5 text-xs font-medium text-foreground transition-colors duration-150 ease-out hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
                                >
                                    <span>Marca: {filters.brand}</span>
                                    <X
                                        className="size-3.5 text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="inline-flex min-h-11 items-center px-2.5 text-xs font-semibold text-foreground underline-offset-4 hover:underline focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            >
                                Limpar filtros
                            </button>
                        </div>
                    )}
                </header>

                {/* Corpo: barra lateral fixa no desktop + grade responsiva de produtos */}
                <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
                    <aside
                        aria-label="Filtros do catálogo"
                        className="hidden w-64 shrink-0 lg:block"
                    >
                        <SearchFiltersPanel
                            isCategoryRoute={isCategoryRoute}
                            fixedCategory={category}
                            selectedCategory={filters.category}
                            selectedBrand={filters.brand}
                            categories={facets.categories}
                            brands={facets.brands}
                            hasActiveFilters={hasActiveFilters}
                            onSelectCategory={handleSelectCategory}
                            onSelectBrand={handleSelectBrand}
                            onClearFilters={handleClearFilters}
                        />
                    </aside>

                    <section
                        aria-labelledby="search-results-heading"
                        className="flex min-w-0 flex-1 flex-col gap-8"
                    >
                        <h2 id="search-results-heading" className="sr-only">
                            Lista de produtos encontrados
                        </h2>

                        {isNavigating ? (
                            <ProductGridSkeleton
                                count={products.meta.perPage || 8}
                            />
                        ) : products.data.length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6">
                                    {products.data.map((product) => (
                                        <ProductCard
                                            key={product.id}
                                            {...product}
                                            headingLevel="h3"
                                        />
                                    ))}
                                </div>

                                {/* Paginação acessível */}
                                {products.meta.lastPage > 1 && (
                                    <nav
                                        aria-label="Paginação de resultados"
                                        className="flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row"
                                    >
                                        <p className="text-sm text-muted-foreground tabular-nums">
                                            Página{' '}
                                            <span className="font-semibold text-foreground">
                                                {products.meta.currentPage}
                                            </span>{' '}
                                            de{' '}
                                            <span className="font-semibold text-foreground">
                                                {products.meta.lastPage}
                                            </span>
                                            {products.meta.from !== null &&
                                                products.meta.to !== null && (
                                                    <span>
                                                        {' '}
                                                        (itens{' '}
                                                        {
                                                            products.meta.from
                                                        } a{' '}
                                                        {products.meta.to} de{' '}
                                                        {products.meta.total})
                                                    </span>
                                                )}
                                        </p>

                                        <div className="flex items-center gap-2">
                                            {products.links.prev ? (
                                                <StoreButton
                                                    variant="outline"
                                                    size="touch"
                                                    asChild
                                                >
                                                    <Link
                                                        href={
                                                            products.links.prev
                                                        }
                                                        preserveState
                                                        rel="prev"
                                                    >
                                                        <ChevronLeft
                                                            className="size-4"
                                                            aria-hidden="true"
                                                        />
                                                        <span>Anterior</span>
                                                    </Link>
                                                </StoreButton>
                                            ) : (
                                                <StoreButton
                                                    type="button"
                                                    variant="outline"
                                                    size="touch"
                                                    disabled
                                                >
                                                    <ChevronLeft
                                                        className="size-4"
                                                        aria-hidden="true"
                                                    />
                                                    <span>Anterior</span>
                                                </StoreButton>
                                            )}

                                            {products.links.next ? (
                                                <StoreButton
                                                    variant="outline"
                                                    size="touch"
                                                    asChild
                                                >
                                                    <Link
                                                        href={
                                                            products.links.next
                                                        }
                                                        preserveState
                                                        rel="next"
                                                    >
                                                        <span>Próxima</span>
                                                        <ChevronRight
                                                            className="size-4"
                                                            aria-hidden="true"
                                                        />
                                                    </Link>
                                                </StoreButton>
                                            ) : (
                                                <StoreButton
                                                    type="button"
                                                    variant="outline"
                                                    size="touch"
                                                    disabled
                                                >
                                                    <span>Próxima</span>
                                                    <ChevronRight
                                                        className="size-4"
                                                        aria-hidden="true"
                                                    />
                                                </StoreButton>
                                            )}
                                        </div>
                                    </nav>
                                )}
                            </>
                        ) : (
                            <EmptyState
                                icon={SearchX}
                                title={
                                    trimmedQuery
                                        ? `Nenhum produto encontrado para “${trimmedQuery}”`
                                        : 'Nenhum produto encontrado com estes filtros'
                                }
                                description="Verifique a grafia do termo pesquisado, tente buscar por marca, SKU ou código EAN, ou acesse diretamente um dos departamentos abaixo."
                                headingLevel="h2"
                                actionLabel={
                                    hasActiveFilters
                                        ? 'Limpar filtros'
                                        : 'Ver catálogo completo'
                                }
                                onAction={
                                    hasActiveFilters
                                        ? handleClearFilters
                                        : undefined
                                }
                                actionHref={
                                    hasActiveFilters
                                        ? undefined
                                        : searchRoutes.index.url()
                                }
                            >
                                {facets.categories.length > 0 && (
                                    <div className="mt-4 flex w-full max-w-xl flex-col items-center gap-2.5 border-t border-border/70 pt-5">
                                        <span className="text-xs font-medium text-muted-foreground">
                                            Departamentos disponíveis:
                                        </span>
                                        <div className="flex flex-wrap items-center justify-center gap-2">
                                            {facets.categories.map((cat) => (
                                                <Link
                                                    key={cat.slug}
                                                    href={categoriesRoutes.show.url(
                                                        cat.slug,
                                                    )}
                                                    className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground transition-colors duration-150 ease-out hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
                                                >
                                                    <span>{cat.name}</span>
                                                    <span className="text-muted-foreground tabular-nums">
                                                        ({cat.count})
                                                    </span>
                                                    <ArrowRight
                                                        className="size-3.5 text-muted-foreground"
                                                        aria-hidden="true"
                                                    />
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </EmptyState>
                        )}
                    </section>
                </div>
            </div>
        </>
    );
}
