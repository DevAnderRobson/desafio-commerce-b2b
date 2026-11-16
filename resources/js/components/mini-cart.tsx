import { Link, router, usePage } from '@inertiajs/react';
import { AlertCircle, Package, ShoppingCart } from 'lucide-react';
import {
    useCallback,
    useEffect,
    useId,
    useRef,
    useState,
    type FocusEvent,
} from 'react';
import { StoreButton } from '@/components/button';
import { CartBadge } from '@/components/cart-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCentsToBRL, formatInteger } from '@/lib/format';
import { cn } from '@/lib/utils';
import cart from '@/routes/cart';
import search from '@/routes/search';
import type { MiniCartData } from '@/types/cart';
import type { MiniCartProps } from '@/types/mini-cart-ui';

const HOVER_DELAY_MS = 150;
const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';

function isDesktopViewport(): boolean {
    if (
        typeof window === 'undefined' ||
        typeof window.matchMedia !== 'function'
    ) {
        return false;
    }

    return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

function MiniCartSkeleton() {
    return (
        <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Carregando resumo do carrinho"
            className="flex flex-col gap-3 pt-3"
        >
            {[0, 1, 2].map((index) => (
                <div key={index} className="flex items-start gap-3">
                    <Skeleton className="size-12 shrink-0 rounded-md" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <Skeleton className="h-3.5 w-4/5" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-4 w-14 shrink-0" />
                </div>
            ))}
            <div className="mt-1 flex flex-col gap-2.5 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-3.5 w-16" />
                    <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-11 w-full rounded-md" />
            </div>
        </div>
    );
}

/**
 * Mini carrinho do navbar (disclosure acessível sem dependências extras):
 * - O link principal do carrinho continua navegando diretamente para `/carrinho` em qualquer viewport.
 * - Em mobile/tablet (`< lg`), NÃO abre popover; apenas navega para `/carrinho`.
 * - Em desktop (`>= lg`), o painel abre ao passar o mouse sobre o carrinho (atraso cancelável de 150 ms)
 *   ou ao focar o link por teclado; não há botão extra: clicar no carrinho abre a página do carrinho.
 * - Ao abrir, revalida `miniCart` via `router.reload({ only: ['miniCart'], preserveUrl: true })`.
 * - Fecha com `Escape` (devolvendo foco ao gatilho), clique fora e perda de foco (o foco volta ao link do carrinho).
 */
export function MiniCart({
    cartHref,
    cartCount,
    miniCart: miniCartProp,
    className,
}: MiniCartProps) {
    const page = usePage();
    const pageMiniCart = page.props.miniCart as MiniCartData | null | undefined;
    const resolvedMiniCart =
        miniCartProp !== undefined ? miniCartProp : pageMiniCart;
    const resolvedCartHref = cartHref ?? cart.show().url;

    const panelId = useId();
    const headingId = useId();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const triggerRef = useRef<HTMLAnchorElement | null>(null);
    const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const skipFocusOpenRef = useRef(false);

    const [isOpen, setIsOpen] = useState(false);

    const clearHoverTimers = useCallback(() => {
        if (openTimerRef.current !== null) {
            clearTimeout(openTimerRef.current);
            openTimerRef.current = null;
        }

        if (closeTimerRef.current !== null) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    }, []);

    const revalidateMiniCart = useCallback(() => {
        router.reload({
            only: ['miniCart'],
            preserveUrl: true,
        });
    }, []);

    const openPopover = useCallback(() => {
        if (!isDesktopViewport()) {
            return;
        }

        clearHoverTimers();
        setIsOpen((prev) => {
            if (!prev) {
                revalidateMiniCart();
            }

            return true;
        });
    }, [clearHoverTimers, revalidateMiniCart]);

    const closePopover = useCallback(
        (options?: { returnFocus?: boolean }) => {
            clearHoverTimers();
            setIsOpen(false);

            if (options?.returnFocus) {
                skipFocusOpenRef.current = true;
                triggerRef.current?.focus();
                skipFocusOpenRef.current = false;
            }
        },
        [clearHoverTimers],
    );

    const handleMouseEnter = useCallback(() => {
        if (!isDesktopViewport()) {
            return;
        }

        if (closeTimerRef.current !== null) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }

        if (isOpen || openTimerRef.current !== null) {
            return;
        }

        openTimerRef.current = setTimeout(() => {
            openTimerRef.current = null;
            openPopover();
        }, HOVER_DELAY_MS);
    }, [isOpen, openPopover]);

    const handleMouseLeave = useCallback(() => {
        if (openTimerRef.current !== null) {
            clearTimeout(openTimerRef.current);
            openTimerRef.current = null;
        }

        if (!isOpen) {
            return;
        }

        if (closeTimerRef.current !== null) {
            clearTimeout(closeTimerRef.current);
        }

        closeTimerRef.current = setTimeout(() => {
            closeTimerRef.current = null;
            setIsOpen(false);
        }, HOVER_DELAY_MS);
    }, [isOpen]);

    const handleBlur = useCallback(
        (event: FocusEvent<HTMLDivElement>) => {
            if (!isOpen) {
                return;
            }

            const nextFocused = event.relatedTarget as Node | null;

            if (
                nextFocused !== null &&
                !event.currentTarget.contains(nextFocused)
            ) {
                clearHoverTimers();
                setIsOpen(false);
            }
        },
        [clearHoverTimers, isOpen],
    );

    useEffect(() => {
        return () => {
            clearHoverTimers();
        };
    }, [clearHoverTimers]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closePopover({ returnFocus: true });
            }
        };

        const handlePointerDownOutside = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node | null;

            if (
                target !== null &&
                containerRef.current &&
                !containerRef.current.contains(target)
            ) {
                closePopover();
            }
        };

        const mediaQueryList =
            typeof window !== 'undefined' &&
            typeof window.matchMedia === 'function'
                ? window.matchMedia(DESKTOP_MEDIA_QUERY)
                : null;

        const handleViewportChange = (event: MediaQueryListEvent) => {
            if (!event.matches) {
                closePopover();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handlePointerDownOutside);
        document.addEventListener('touchstart', handlePointerDownOutside, {
            passive: true,
        });
        mediaQueryList?.addEventListener('change', handleViewportChange);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handlePointerDownOutside);
            document.removeEventListener(
                'touchstart',
                handlePointerDownOutside,
            );
            mediaQueryList?.removeEventListener('change', handleViewportChange);
        };
    }, [closePopover, isOpen]);

    const visibleItems = resolvedMiniCart?.items.slice(0, 5) ?? [];

    return (
        <div
            ref={containerRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onFocus={() => {
                if (!skipFocusOpenRef.current) {
                    openPopover();
                }
            }}
            onBlur={handleBlur}
            className={cn('relative inline-flex items-center', className)}
        >
            <StoreButton
                variant="outline"
                size="touch"
                asChild
                className="relative px-2.5 focus-visible:z-10 sm:px-3.5"
            >
                <Link
                    ref={triggerRef}
                    href={resolvedCartHref}
                    aria-controls={panelId}
                    aria-expanded={isOpen}
                >
                    <ShoppingCart
                        className="size-5 shrink-0"
                        aria-hidden="true"
                    />
                    <span className="hidden text-sm font-medium sm:inline">
                        Carrinho
                    </span>
                    <CartBadge count={cartCount} />
                </Link>
            </StoreButton>

            <div
                id={panelId}
                role="region"
                aria-labelledby={headingId}
                hidden={!isOpen}
                className={cn(
                    'absolute top-full right-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none',
                    isOpen
                        ? 'hidden animate-in duration-150 ease-out fade-in-0 zoom-in-95 motion-reduce:animate-none lg:block'
                        : 'hidden',
                )}
            >
                <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                    <p
                        id={headingId}
                        className="text-sm font-semibold tracking-tight text-foreground"
                    >
                        Resumo do carrinho
                    </p>
                    {resolvedMiniCart?.canView && (
                        <span className="text-xs font-medium text-muted-foreground tabular-nums">
                            {formatInteger(resolvedMiniCart.count)}{' '}
                            {resolvedMiniCart.count === 1
                                ? 'unidade'
                                : 'unidades'}
                        </span>
                    )}
                </div>

                {isOpen && (
                    <>
                        {resolvedMiniCart === undefined ? (
                            <MiniCartSkeleton />
                        ) : resolvedMiniCart === null ||
                          !resolvedMiniCart.canView ? (
                            <div className="pt-3 text-sm text-muted-foreground">
                                <p className="font-medium text-foreground">
                                    Disponível após a aprovação do cadastro
                                </p>
                            </div>
                        ) : visibleItems.length === 0 ? (
                            <div className="flex flex-col items-start gap-3 pt-3">
                                <p className="text-sm text-muted-foreground">
                                    Seu carrinho está vazio.
                                </p>
                                <StoreButton
                                    variant="outline"
                                    size="touch"
                                    asChild
                                    className="w-full"
                                >
                                    <Link
                                        href={search.index().url}
                                        onClick={() => closePopover()}
                                    >
                                        Ver produtos
                                    </Link>
                                </StoreButton>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3 pt-3">
                                <ul
                                    aria-label="Itens no carrinho"
                                    className="flex max-h-80 flex-col divide-y divide-border/70 overflow-y-auto pr-0.5"
                                >
                                    {visibleItems.map((item) => (
                                        <li
                                            key={item.id}
                                            className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0"
                                        >
                                            <div className="flex items-start gap-3">
                                                <Link
                                                    href={item.href}
                                                    tabIndex={-1}
                                                    aria-hidden="true"
                                                    onClick={() =>
                                                        closePopover()
                                                    }
                                                    className="relative size-12 shrink-0 overflow-hidden rounded-md border border-border/70 bg-muted/50"
                                                >
                                                    {item.imageUrl ? (
                                                        <img
                                                            src={item.imageUrl}
                                                            alt={
                                                                item.imageAlt ||
                                                                item.name
                                                            }
                                                            width={48}
                                                            height={48}
                                                            loading="lazy"
                                                            decoding="async"
                                                            className="size-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex size-full items-center justify-center text-muted-foreground">
                                                            <Package
                                                                className="size-5 stroke-[1.5]"
                                                                aria-hidden="true"
                                                            />
                                                        </div>
                                                    )}
                                                </Link>

                                                <div className="flex min-w-0 flex-1 flex-col gap-1">
                                                    <Link
                                                        href={item.href}
                                                        onClick={() =>
                                                            closePopover()
                                                        }
                                                        className="line-clamp-2 rounded-xs text-sm leading-snug font-medium text-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                                    >
                                                        {item.name}
                                                    </Link>

                                                    <div className="flex items-baseline justify-between gap-2 text-xs tabular-nums">
                                                        <span className="text-muted-foreground">
                                                            {formatInteger(
                                                                item.quantity,
                                                            )}{' '}
                                                            ×{' '}
                                                            {formatCentsToBRL(
                                                                item.unitPriceCents,
                                                            )}
                                                        </span>
                                                        <span
                                                            className={cn(
                                                                'shrink-0 text-sm font-semibold',
                                                                item.hasIssue
                                                                    ? 'text-muted-foreground line-through'
                                                                    : 'text-foreground',
                                                            )}
                                                        >
                                                            {formatCentsToBRL(
                                                                item.lineTotalCents,
                                                            )}
                                                        </span>
                                                    </div>

                                                    {item.hasIssue && (
                                                        <p
                                                            role="status"
                                                            className="flex items-center gap-1 text-xs font-medium text-destructive"
                                                        >
                                                            <AlertCircle
                                                                className="size-3.5 shrink-0"
                                                                aria-hidden="true"
                                                            />
                                                            <span>
                                                                Item
                                                                indisponível —
                                                                revise no
                                                                carrinho
                                                            </span>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>

                                {resolvedMiniCart.hiddenItemsCount > 0 && (
                                    <p className="border-t border-border/60 pt-2.5 text-center text-xs font-medium text-muted-foreground tabular-nums">
                                        +
                                        {formatInteger(
                                            resolvedMiniCart.hiddenItemsCount,
                                        )}{' '}
                                        {resolvedMiniCart.hiddenItemsCount === 1
                                            ? 'item'
                                            : 'itens'}
                                    </p>
                                )}

                                <div className="flex flex-col gap-3 border-t border-border pt-3">
                                    <div className="flex items-baseline justify-between gap-2">
                                        <span className="text-xs font-medium text-muted-foreground">
                                            Subtotal
                                        </span>
                                        <span className="text-base font-bold tracking-tight text-foreground tabular-nums">
                                            {formatCentsToBRL(
                                                resolvedMiniCart.subtotalCents,
                                            )}
                                        </span>
                                    </div>

                                    <StoreButton
                                        variant="brand"
                                        size="touch"
                                        asChild
                                        className="w-full"
                                    >
                                        <Link
                                            href={cart.show().url}
                                            onClick={() => closePopover()}
                                        >
                                            Ir para o carrinho
                                        </Link>
                                    </StoreButton>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default MiniCart;
