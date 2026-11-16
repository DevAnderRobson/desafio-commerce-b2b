import type { ProductCardProps } from '@/components/product-card';

/**
 * Contrato de props da home (`store/home`), produzido por `App\Http\Controllers\HomeController`.
 * Preços chegam já resolvidos para o cliente logado (ou `guest`/`pending_approval`).
 */
export type HomeProduct = Pick<
    ProductCardProps,
    | 'id'
    | 'sku'
    | 'name'
    | 'brand'
    | 'slug'
    | 'categoryName'
    | 'imageUrl'
    | 'imageAlt'
    | 'inStock'
    | 'stockQuantity'
    | 'priceState'
    | 'showAddToCart'
    | 'wishlisted'
> & {
    href: string;
};

export type HomeCategory = {
    id: number;
    name: string;
    slug: string;
    href: string;
    productCount: number;
};

export type HomePageProps = {
    categories: HomeCategory[];
    /** Props adiadas (Inertia::defer): `undefined` até carregar. Lista vazia = esconder a seção. */
    promotions?: HomeProduct[];
    bestSellers?: HomeProduct[];
    featured?: HomeProduct[];
};
