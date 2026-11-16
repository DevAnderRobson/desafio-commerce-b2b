import { Deferred, Head, Link, router, usePage } from '@inertiajs/react';
import { useCallback } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ProductBuyBox } from '@/components/product-buy-box';
import { ProductGallery } from '@/components/product-gallery';
import {
    ReviewSection,
    ReviewSectionSkeleton,
} from '@/components/review-section';
import { ShareButton } from '@/components/share-button';
import { storeToast } from '@/components/toast';
import { WishlistButton } from '@/components/wishlist-button';
import { home } from '@/routes';
import type { BreadcrumbItem, User } from '@/types';
import type { SharedCart } from '@/types/cart';
import type { ProductPageProps } from '@/types/product';

export type ProductRoutes = {
    login: string;
    wishlistAdd: string;
    wishlistRemove: string;
    cartAdd: string;
    reviewSubmit: string;
};

export type StoreProductPageProps = ProductPageProps & {
    routes: ProductRoutes;
};

/**
 * Página de detalhe do produto B2B (Onda 4):
 * - Usa `StoreLayout` automaticamente (convenção `store/...` em `app.tsx`).
 * - `<Head>` com título, descrição e Open Graph canônico SEM preço (privacidade B2B D13).
 * - Breadcrumb estruturado: Início > Categoria > Produto.
 * - Galeria 1:1 com lightbox e zoom completo (`ProductGallery`).
 * - Caixa de decisão de compra (`ProductBuyBox`) com preço dinâmico de atacado e barra fixa mobile.
 * - Ações secundárias de compartilhar (`ShareButton`) e favoritar (`WishlistButton`).
 * - Descrição e especificações técnicas sem cards aninhados.
 * - Avaliações carregadas via `<Deferred data="reviews">` do Inertia v3.
 */
export default function StoreProductPage({
    product,
    reviews,
    routes,
}: StoreProductPageProps) {
    const page = usePage();
    const user = (page.props.auth as { user?: User | null } | undefined)?.user;
    const isGuest = !user || product.priceState.status === 'guest';

    const metaDescription = product.description
        ? product.description.slice(0, 160)
        : `${product.name}${product.brand ? ` — ${product.brand}` : ''}. Consulte especificações técnicas e condições de fornecimento B2B.`;

    const primaryImageUrl = product.images[0]?.url ?? null;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Início',
            href: home(),
        },
        {
            title: product.category.name,
            href: product.category.href,
        },
        {
            title: product.name,
            href: product.canonicalUrl,
        },
    ];

    const handleAddToCart = useCallback(
        (quantity: number): Promise<void> => {
            if (
                !product.canPurchase ||
                product.availability.status === 'out_of_stock' ||
                quantity > product.availability.quantity
            ) {
                return Promise.reject(
                    new Error(
                        'Quantidade indisponível no estoque atual deste produto.',
                    ),
                );
            }

            return new Promise<void>((resolve, reject) => {
                let settled = false;

                router
                    .optimistic<{ cart?: SharedCart }>((props) => ({
                        cart: {
                            ...props.cart,
                            count: (props.cart?.count ?? 0) + quantity,
                        },
                    }))
                    .post(
                        routes.cartAdd,
                        {
                            product_id: product.id,
                            quantity,
                        },
                        {
                            preserveScroll: true,
                            onSuccess: () => {
                                settled = true;
                                storeToast.success(
                                    `${quantity} ${quantity === 1 ? 'unidade adicionada' : 'unidades adicionadas'} ao carrinho.`,
                                    {
                                        description: product.name,
                                    },
                                );
                                resolve();
                            },
                            onError: (errors) => {
                                settled = true;
                                const message =
                                    errors.quantity ||
                                    errors.product_id ||
                                    Object.values(errors)[0] ||
                                    'Não foi possível adicionar ao carrinho. Verifique a quantidade em estoque e tente novamente.';
                                reject(new Error(message));
                            },
                            onCancel: () => {
                                if (!settled) {
                                    settled = true;
                                    reject(
                                        new Error(
                                            'A adição ao carrinho foi cancelada. Tente novamente.',
                                        ),
                                    );
                                }
                            },
                            onFinish: () => {
                                if (!settled) {
                                    settled = true;
                                    resolve();
                                }
                            },
                        },
                    );
            });
        },
        [
            product.availability.quantity,
            product.availability.status,
            product.canPurchase,
            product.id,
            product.name,
            routes.cartAdd,
        ],
    );

    const hasMobileBottomBar =
        product.priceState.status === 'available' ||
        product.priceState.status === 'guest';

    return (
        <>
            <Head title={product.name}>
                <meta
                    head-key="description"
                    name="description"
                    content={metaDescription}
                />
                <link
                    head-key="canonical"
                    rel="canonical"
                    href={product.canonicalUrl}
                />
                <meta head-key="og:type" property="og:type" content="product" />
                <meta
                    head-key="og:title"
                    property="og:title"
                    content={product.name}
                />
                <meta
                    head-key="og:description"
                    property="og:description"
                    content={metaDescription}
                />
                <meta
                    head-key="og:url"
                    property="og:url"
                    content={product.canonicalUrl}
                />
                {primaryImageUrl && (
                    <meta
                        head-key="og:image"
                        property="og:image"
                        content={primaryImageUrl}
                    />
                )}
            </Head>

            <div
                className={
                    hasMobileBottomBar
                        ? 'flex flex-col gap-10 pb-20 md:pb-0 lg:gap-12'
                        : 'flex flex-col gap-10 lg:gap-12'
                }
            >
                {/* Breadcrumb: Início > Categoria > Produto */}
                <div className="border-b border-border/70 pb-3">
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>

                {/* Dobra principal: Galeria (esquerda >= lg) + Informações e Caixa de Compra (direita >= lg) */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start lg:gap-10">
                    <div className="lg:col-span-6 xl:col-span-7">
                        <ProductGallery
                            images={product.images}
                            productName={product.name}
                            brand={product.brand}
                        />
                    </div>

                    <div className="flex flex-col gap-5 lg:col-span-6 xl:col-span-5">
                        {/* Identificação do produto: Categoria, Marca, Nome (h1), SKU e EAN */}
                        <header className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                <Link
                                    href={product.category.href}
                                    className="font-semibold text-foreground underline-offset-4 hover:underline focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                >
                                    {product.category.name}
                                </Link>
                                {product.brand && (
                                    <>
                                        <span aria-hidden="true">·</span>
                                        <span className="font-medium">
                                            Marca: {product.brand}
                                        </span>
                                    </>
                                )}
                            </div>

                            <h1 className="font-semibold tracking-tight text-foreground">
                                {product.name}
                            </h1>

                            <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 font-mono text-xs text-muted-foreground tabular-nums">
                                <div className="inline-flex items-center gap-1">
                                    <dt className="font-sans font-medium">
                                        SKU:
                                    </dt>
                                    <dd className="text-foreground">
                                        {product.sku}
                                    </dd>
                                </div>

                                {product.ean && (
                                    <div className="inline-flex items-center gap-1">
                                        <dt className="font-sans font-medium">
                                            EAN:
                                        </dt>
                                        <dd className="text-foreground">
                                            {product.ean}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </header>

                        {/* Caixa de decisão de compra: preço, atacado, estoque, seletor de quantidade e botão primário */}
                        <ProductBuyBox
                            priceState={product.priceState}
                            availability={product.availability}
                            promotionEndsAt={product.promotionEndsAt}
                            canPurchase={product.canPurchase}
                            loginHref={routes.login}
                            onAddToCart={handleAddToCart}
                        />

                        {/* Ações secundárias: Favoritar e Compartilhar */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            <WishlistButton
                                productId={product.id}
                                wishlisted={product.wishlisted}
                                isGuest={isGuest}
                                loginHref={routes.login}
                                addHref={routes.wishlistAdd}
                                removeHref={routes.wishlistRemove}
                                productName={product.name}
                            />

                            <ShareButton
                                canonicalUrl={product.canonicalUrl}
                                title={product.name}
                                text={
                                    product.brand
                                        ? `${product.name} (${product.brand})`
                                        : product.name
                                }
                            />
                        </div>
                    </div>
                </div>

                {/* Descrição e Ficha Técnica (product_attributes / specifications) sem cards aninhados */}
                {(product.description || product.specifications.length > 0) && (
                    <div className="grid grid-cols-1 gap-8 border-t border-border pt-8 lg:grid-cols-12 lg:gap-10 lg:pt-10">
                        {product.description && (
                            <section
                                aria-labelledby="product-description-heading"
                                className={
                                    product.specifications.length > 0
                                        ? 'flex flex-col gap-3 lg:col-span-7'
                                        : 'flex flex-col gap-3 lg:col-span-12'
                                }
                            >
                                <h2
                                    id="product-description-heading"
                                    className="font-semibold tracking-tight text-foreground"
                                >
                                    Descrição do produto
                                </h2>
                                <div className="max-w-prose text-fluid-base leading-relaxed whitespace-pre-line text-foreground/90">
                                    {product.description}
                                </div>
                            </section>
                        )}

                        {product.specifications.length > 0 && (
                            <section
                                aria-labelledby="product-specs-heading"
                                className={
                                    product.description
                                        ? 'flex flex-col gap-3 lg:col-span-5'
                                        : 'flex flex-col gap-3 lg:col-span-12'
                                }
                            >
                                <h2
                                    id="product-specs-heading"
                                    className="font-semibold tracking-tight text-foreground"
                                >
                                    Ficha técnica
                                </h2>
                                <dl className="divide-y divide-border border-t border-b border-border text-sm">
                                    {product.specifications.map((spec) => (
                                        <div
                                            key={`${spec.name}-${spec.value}`}
                                            className="grid grid-cols-2 gap-4 py-3"
                                        >
                                            <dt className="font-medium text-muted-foreground">
                                                {spec.name}
                                            </dt>
                                            <dd className="font-semibold text-foreground">
                                                {spec.value}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            </section>
                        )}
                    </div>
                )}

                {/* Avaliações de clientes via Deferred prop do Inertia v3 */}
                <Deferred data="reviews" fallback={<ReviewSectionSkeleton />}>
                    {reviews ? (
                        <ReviewSection
                            summary={reviews.summary}
                            filters={reviews.filters}
                            list={reviews.list}
                            permission={reviews.permission}
                            submitHref={routes.reviewSubmit}
                            loginHref={routes.login}
                            productUrl={product.canonicalUrl}
                        />
                    ) : (
                        <ReviewSectionSkeleton />
                    )}
                </Deferred>
            </div>
        </>
    );
}
