import { Link, type InertiaLinkProps } from '@inertiajs/react';
import { Lock, Package, ShoppingCart } from 'lucide-react';
import type { ReactNode } from 'react';
import { StoreButton } from '@/components/button';
import { PriceBadge } from '@/components/price-badge';
import { formatCentsToBRL } from '@/lib/format';
import { cn } from '@/lib/utils';
import type {
    ProductPriceState,
    ProductPriceVisibilityStatus,
} from '@/types/store';

export type ProductCardProps = {
    id: number | string;
    sku?: string;
    name: string;
    brand: string;
    slug?: string;
    href?: NonNullable<InertiaLinkProps['href']>;
    categoryName?: string;
    imageUrl?: string | null;
    imageSrcSet?: string;
    imageSizes?: string;
    imageAlt?: string;
    inStock?: boolean;
    stockQuantity?: number;
    /** Estado discriminado de preço do produto conforme política B2B. */
    priceState?: ProductPriceState;
    /** Atalho opcional para definir o status sem objeto discriminado completo. */
    priceStatus?: ProductPriceVisibilityStatus;
    unitPriceCents?: number;
    originalPriceCents?: number | null;
    discountPercent?: number | null;
    wholesalePriceCents?: number | null;
    wholesaleMinQuantity?: number | null;
    purchaseModelName?: string;
    loginHref?: NonNullable<InertiaLinkProps['href']>;
    /** Exibe o botão de adicionar ao carrinho (somente ativo quando há preço disponível). */
    showAddToCart?: boolean;
    onAddToCart?: (productId: number | string) => void;
    addToCartLabel?: string;
    isAddingToCart?: boolean;
    headingLevel?: 'h2' | 'h3';
    headerActionSlot?: ReactNode;
    footerSlot?: ReactNode;
    className?: string;
};

function resolvePriceState(props: ProductCardProps): ProductPriceState {
    if (props.priceState) {
        return props.priceState;
    }

    const status = props.priceStatus ?? 'guest';

    if (status === 'available' && typeof props.unitPriceCents === 'number') {
        return {
            status: 'available',
            unitPriceCents: props.unitPriceCents,
            originalPriceCents: props.originalPriceCents,
            discountPercent: props.discountPercent,
            wholesalePriceCents: props.wholesalePriceCents,
            wholesaleMinQuantity: props.wholesaleMinQuantity,
        };
    }

    if (status === 'pending_approval') {
        return { status: 'pending_approval' };
    }

    if (status === 'unavailable_for_model') {
        return {
            status: 'unavailable_for_model',
            purchaseModelName: props.purchaseModelName,
        };
    }

    return {
        status: 'guest',
        loginHref: props.loginHref,
    };
}

/**
 * Card único de produto reutilizado em home, busca, carrosséis e lista de desejos.
 * Segue as regras B2B de privacidade de preço (D13/D14) e diretrizes Impeccable:
 * - Imagem com proporção 1:1 reservada para evitar CLS
 * - Sem card dentro de card
 * - Alvos de toque >= 44x44px
 * - Contraste >= 4,5:1 e suporte a teclado/TV
 */
export function ProductCard(props: ProductCardProps) {
    const {
        id,
        sku,
        name,
        brand,
        slug,
        href,
        imageUrl,
        imageSrcSet,
        imageSizes = '(min-width: 1536px) 280px, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw',
        imageAlt,
        inStock = true,
        stockQuantity,
        showAddToCart = false,
        onAddToCart,
        addToCartLabel = 'Adicionar ao carrinho',
        isAddingToCart = false,
        headingLevel = 'h3',
        headerActionSlot,
        footerSlot,
        className,
    } = props;

    const productHref = href ?? `/produtos/${slug ?? id}`;
    const resolvedPrice = resolvePriceState(props);
    const isAvailableInStock =
        inStock && (stockQuantity === undefined || stockQuantity > 0);
    const HeadingTag = headingLevel;
    const shouldRenderAddButton =
        (showAddToCart || Boolean(onAddToCart)) &&
        resolvedPrice.status === 'available';

    return (
        <article
            className={cn(
                'group relative flex h-full flex-col rounded-lg border border-border bg-card text-card-foreground transition-[border-color,box-shadow] duration-150 ease-out focus-within:border-ring hover:border-foreground/25 motion-reduce:transition-none',
                className,
            )}
        >
            {/* Área de imagem com proporção reservada (1:1) contra CLS */}
            <div className="relative aspect-square w-full overflow-hidden rounded-t-lg border-b border-border/60 bg-muted/50">
                <Link
                    href={productHref}
                    tabIndex={-1}
                    aria-hidden="true"
                    className="block size-full outline-none"
                >
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            srcSet={imageSrcSet}
                            sizes={imageSizes}
                            alt={imageAlt ?? name}
                            width={400}
                            height={400}
                            loading="lazy"
                            decoding="async"
                            className="size-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                        />
                    ) : (
                        <div className="flex size-full flex-col items-center justify-center gap-2 p-4 text-muted-foreground">
                            <Package
                                className="size-10 stroke-[1.5]"
                                aria-hidden="true"
                            />
                            <span className="text-xs font-medium">{brand}</span>
                        </div>
                    )}
                </Link>

                {/* Selo promocional discreto quando preço está disponível */}
                {resolvedPrice.status === 'available' &&
                    typeof resolvedPrice.discountPercent === 'number' &&
                    resolvedPrice.discountPercent > 0 && (
                        <div className="pointer-events-none absolute top-2.5 left-2.5">
                            <PriceBadge
                                variant="promo"
                                discountPercent={resolvedPrice.discountPercent}
                            />
                        </div>
                    )}

                {/* Slot opcional para ação secundária (ex.: favoritar na onda 4/8) com alvo >= 44px */}
                {headerActionSlot && (
                    <div className="absolute top-2 right-2 z-10">
                        {headerActionSlot}
                    </div>
                )}
            </div>

            {/* Conteúdo textual e área de preço/estado */}
            <div className="flex flex-1 flex-col justify-between gap-3 p-3.5 sm:p-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="truncate font-medium">{brand}</span>
                        {sku && (
                            <span className="shrink-0 font-mono text-[11px]">
                                SKU {sku}
                            </span>
                        )}
                    </div>

                    <HeadingTag className="text-fluid-sm leading-snug font-semibold text-foreground">
                        <Link
                            href={productHref}
                            className="line-clamp-2 rounded-xs outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            {name}
                        </Link>
                    </HeadingTag>
                </div>

                {/* Área de preço ou estado comercial B2B (sem card aninhado) */}
                <div className="mt-auto flex flex-col gap-2.5 border-t border-border/70 pt-3">
                    {resolvedPrice.status === 'available' && (
                        <div className="flex flex-col gap-1">
                            {typeof resolvedPrice.originalPriceCents ===
                                'number' &&
                                resolvedPrice.originalPriceCents >
                                    resolvedPrice.unitPriceCents && (
                                    <span className="text-xs text-muted-foreground tabular-nums line-through">
                                        De{' '}
                                        {formatCentsToBRL(
                                            resolvedPrice.originalPriceCents,
                                        )}
                                    </span>
                                )}

                            <div className="flex items-baseline gap-1.5">
                                <span className="text-fluid-price leading-none font-semibold tracking-tight text-foreground tabular-nums">
                                    {formatCentsToBRL(
                                        resolvedPrice.unitPriceCents,
                                    )}
                                </span>
                                <span className="text-xs font-normal text-muted-foreground">
                                    / un.
                                </span>
                            </div>

                            {typeof resolvedPrice.wholesalePriceCents ===
                                'number' &&
                                typeof resolvedPrice.wholesaleMinQuantity ===
                                    'number' &&
                                resolvedPrice.wholesaleMinQuantity > 0 && (
                                    <div className="pt-0.5">
                                        <PriceBadge
                                            variant="wholesale"
                                            wholesaleMinQuantity={
                                                resolvedPrice.wholesaleMinQuantity
                                            }
                                            wholesalePriceCents={
                                                resolvedPrice.wholesalePriceCents
                                            }
                                        />
                                    </div>
                                )}
                        </div>
                    )}

                    {resolvedPrice.status === 'guest' && (
                        <div className="flex flex-col gap-1.5">
                            <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                                <Lock
                                    className="size-3.5 shrink-0 text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <span>
                                    {resolvedPrice.message ??
                                        'Entre para ver seu preço'}
                                </span>
                            </p>
                            <Link
                                href={resolvedPrice.loginHref ?? '/login'}
                                className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline-offset-4 hover:underline focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            >
                                Acessar conta B2B
                            </Link>
                        </div>
                    )}

                    {resolvedPrice.status === 'pending_approval' && (
                        <div className="flex flex-col gap-1">
                            <p className="text-sm font-semibold text-warning-muted-foreground">
                                {resolvedPrice.message ?? 'Cadastro em análise'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Preços e compras serão liberados após a
                                aprovação da sua empresa.
                            </p>
                        </div>
                    )}

                    {resolvedPrice.status === 'unavailable_for_model' && (
                        <div className="flex flex-col gap-1">
                            <p className="text-sm font-medium text-muted-foreground">
                                {resolvedPrice.message ??
                                    'Indisponível para o seu modelo de compra'}
                            </p>
                            {resolvedPrice.purchaseModelName && (
                                <p className="text-xs text-muted-foreground">
                                    Tabela ativa:{' '}
                                    {resolvedPrice.purchaseModelName}
                                </p>
                            )}
                        </div>
                    )}

                    {shouldRenderAddButton && (
                        <StoreButton
                            type="button"
                            variant={isAvailableInStock ? 'default' : 'outline'}
                            size="touch"
                            disabled={!isAvailableInStock}
                            loading={isAddingToCart}
                            loadingText="Adicionando..."
                            onClick={() => onAddToCart?.(id)}
                            className="h-auto min-h-11 w-full py-2 leading-tight whitespace-normal"
                        >
                            <ShoppingCart
                                className="size-4 shrink-0"
                                aria-hidden="true"
                            />
                            <span className="text-center text-balance">
                                {isAvailableInStock
                                    ? addToCartLabel
                                    : 'Sem estoque'}
                            </span>
                        </StoreButton>
                    )}

                    {footerSlot}
                </div>
            </div>
        </article>
    );
}

export default ProductCard;
