import { Head, Link, router } from '@inertiajs/react';
import {
    AlertCircle,
    Heart,
    RotateCcw,
    ShoppingBag,
    ShoppingCart,
    Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { StoreButton } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ProductCard } from '@/components/product-card';
import { PRODUCT_GRID_CLASSES } from '@/components/product-card-skeleton';
import { storeToast } from '@/components/toast';
import { formatInteger } from '@/lib/format';
import { dashboard } from '@/routes/account';
import { index as wishlistIndex } from '@/routes/account/wishlist';
import type { AccountWishlistProps, WishlistProduct } from '@/types/account';
import type { RemovedWishlistItemSnapshot } from '@/types/account-ui';

const UNDO_BANNER_DURATION_MS = 7000;

function isProductAvailableToMove(product: WishlistProduct): boolean {
    const inStock =
        Boolean(product.inStock) &&
        (product.stockQuantity === undefined || product.stockQuantity > 0);

    return product.priceState?.status === 'available' && inStock;
}

function resolveUnavailableReason(product: WishlistProduct): string {
    const inStock =
        Boolean(product.inStock) &&
        (product.stockQuantity === undefined || product.stockQuantity > 0);

    if (!inStock) {
        return 'Sem estoque no momento — indisponível para mover ao carrinho.';
    }

    switch (product.priceState?.status) {
        case 'pending_approval':
            return 'Compra disponível após a aprovação do cadastro da empresa.';
        case 'unavailable_for_model':
            return 'Produto indisponível para o modelo de compra da sua empresa.';
        case 'guest':
        default:
            return 'Preço e compra indisponíveis no momento.';
    }
}

export default function AccountWishlist({
    products,
    routes,
}: AccountWishlistProps) {
    const headingId = useId();
    const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [movingId, setMovingId] = useState<WishlistProduct['id'] | null>(
        null,
    );
    const [removingId, setRemovingId] = useState<WishlistProduct['id'] | null>(
        null,
    );
    const [isUndoing, setIsUndoing] = useState(false);
    const [removedSnapshot, setRemovedSnapshot] =
        useState<RemovedWishlistItemSnapshot | null>(null);

    const clearUndoTimer = useCallback(() => {
        if (undoTimerRef.current !== null) {
            clearTimeout(undoTimerRef.current);
            undoTimerRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            clearUndoTimer();
        };
    }, [clearUndoTimer]);

    const handleMoveToCart = useCallback(
        (product: WishlistProduct) => {
            if (
                movingId !== null ||
                removingId !== null ||
                !isProductAvailableToMove(product)
            ) {
                return;
            }

            setMovingId(product.id);
            router.post(
                `${routes.moveBase}/${product.id}/mover`,
                {},
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        clearUndoTimer();
                        setRemovedSnapshot(null);
                    },
                    onError: (errors) => {
                        const message =
                            errors.quantity ??
                            Object.values(errors)[0] ??
                            'Não foi possível mover o produto para o carrinho.';
                        storeToast.error(message);
                    },
                    onFinish: () => {
                        setMovingId(null);
                    },
                },
            );
        },
        [clearUndoTimer, movingId, removingId, routes.moveBase],
    );

    const handleUndoRemove = useCallback(
        (snapshot: RemovedWishlistItemSnapshot) => {
            if (isUndoing) {
                return;
            }

            clearUndoTimer();
            setIsUndoing(true);

            router.post(
                `${routes.removeBase}/${snapshot.id}`,
                { product_id: snapshot.id },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setRemovedSnapshot(null);
                        storeToast.success(
                            `"${snapshot.name}" restaurado na lista de desejos.`,
                        );
                    },
                    onError: () => {
                        storeToast.error(
                            'Não foi possível restaurar o produto na lista de desejos.',
                        );
                    },
                    onFinish: () => {
                        setIsUndoing(false);
                    },
                },
            );
        },
        [clearUndoTimer, isUndoing, routes.removeBase],
    );

    const handleRemoveProduct = useCallback(
        (product: WishlistProduct) => {
            if (movingId !== null || removingId !== null) {
                return;
            }

            const snapshot: RemovedWishlistItemSnapshot = {
                id: product.id,
                name: product.name,
            };

            setRemovingId(product.id);
            router.delete(`${routes.removeBase}/${product.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    clearUndoTimer();
                    setRemovedSnapshot(snapshot);
                    undoTimerRef.current = setTimeout(() => {
                        setRemovedSnapshot(null);
                        undoTimerRef.current = null;
                    }, UNDO_BANNER_DURATION_MS);

                    storeToast.info(
                        `"${snapshot.name}" removido da lista de desejos.`,
                        {
                            recoveryAction: {
                                label: 'Desfazer',
                                onClick: () => handleUndoRemove(snapshot),
                            },
                        },
                    );
                },
                onError: () => {
                    storeToast.error(
                        'Não foi possível remover o item da lista de desejos.',
                    );
                },
                onFinish: () => {
                    setRemovingId(null);
                },
            });
        },
        [
            clearUndoTimer,
            handleUndoRemove,
            movingId,
            removingId,
            routes.removeBase,
        ],
    );

    return (
        <>
            <Head title="Lista de desejos" />

            <section
                aria-labelledby={headingId}
                className="flex flex-col gap-5"
            >
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                        <h2
                            id={headingId}
                            className="text-fluid-lg font-semibold tracking-tight text-foreground"
                        >
                            Produtos salvos pelo seu usuário
                        </h2>
                        <p
                            role="status"
                            aria-live="polite"
                            className="text-sm text-muted-foreground"
                        >
                            {products.length === 0
                                ? 'Salve itens do catálogo para facilitar cotações e recompras futuras.'
                                : `${formatInteger(products.length)} ${products.length === 1 ? 'produto salvo' : 'produtos salvos'} na sua lista individual.`}
                        </p>
                    </div>

                    {products.length > 0 && (
                        <StoreButton
                            variant="outline"
                            size="touch"
                            asChild
                            className="font-semibold"
                        >
                            <Link href={routes.shop}>
                                <ShoppingBag
                                    className="size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <span>Continuar comprando</span>
                            </Link>
                        </StoreButton>
                    )}
                </div>

                {/* Aviso leve com opção de desfazer remoção */}
                {removedSnapshot !== null && (
                    <div
                        role="status"
                        aria-live="polite"
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/60 px-4 py-3 text-sm text-foreground"
                    >
                        <span>
                            <strong className="font-semibold">
                                {removedSnapshot.name}
                            </strong>{' '}
                            foi removido da sua lista de desejos.
                        </span>

                        <StoreButton
                            type="button"
                            variant="outline"
                            size="touch"
                            loading={isUndoing}
                            loadingText="Restaurando..."
                            onClick={() => handleUndoRemove(removedSnapshot)}
                            className="bg-background font-semibold"
                        >
                            <RotateCcw
                                className="size-3.5 shrink-0"
                                aria-hidden="true"
                            />
                            <span>Desfazer</span>
                        </StoreButton>
                    </div>
                )}

                {products.length === 0 ? (
                    <EmptyState
                        icon={Heart}
                        headingLevel="h3"
                        title="Sua lista de desejos está vazia"
                        description="Explore o catálogo para salvar produtos de uso recorrente da sua operação e movê-los rapidamente para o carrinho."
                        actionLabel="Ir para a loja"
                        actionHref={routes.shop}
                    />
                ) : (
                    <div className={PRODUCT_GRID_CLASSES}>
                        {products.map((product) => {
                            const canMove = isProductAvailableToMove(product);
                            const isMovingThis = movingId === product.id;
                            const isRemovingThis = removingId === product.id;
                            const unavailableReason = canMove
                                ? null
                                : resolveUnavailableReason(product);

                            return (
                                <ProductCard
                                    key={product.id}
                                    {...product}
                                    showAddToCart={false}
                                    headerActionSlot={undefined}
                                    footerSlot={
                                        <div className="flex flex-col gap-2 pt-1">
                                            {canMove ? (
                                                <StoreButton
                                                    type="button"
                                                    variant="default"
                                                    size="touch"
                                                    disabled={
                                                        movingId !== null ||
                                                        removingId !== null
                                                    }
                                                    loading={isMovingThis}
                                                    loadingText="Movendo..."
                                                    onClick={() =>
                                                        handleMoveToCart(
                                                            product,
                                                        )
                                                    }
                                                    className="h-auto min-h-11 w-full py-2 leading-tight font-semibold whitespace-normal"
                                                >
                                                    <ShoppingCart
                                                        className="size-4 shrink-0"
                                                        aria-hidden="true"
                                                    />
                                                    <span className="text-center text-balance">
                                                        Mover para o carrinho
                                                    </span>
                                                </StoreButton>
                                            ) : (
                                                <div
                                                    role="status"
                                                    className="flex items-start gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs leading-snug text-muted-foreground"
                                                >
                                                    <AlertCircle
                                                        className="mt-0.5 size-3.5 shrink-0 text-foreground/75"
                                                        aria-hidden="true"
                                                    />
                                                    <span>
                                                        {unavailableReason}
                                                    </span>
                                                </div>
                                            )}

                                            <StoreButton
                                                type="button"
                                                variant="ghost"
                                                size="touch"
                                                disabled={
                                                    movingId !== null ||
                                                    removingId !== null
                                                }
                                                loading={isRemovingThis}
                                                loadingText="Removendo..."
                                                aria-label={`Remover ${product.name} da lista de desejos`}
                                                onClick={() =>
                                                    handleRemoveProduct(product)
                                                }
                                                className="h-11 w-full text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                            >
                                                <Trash2
                                                    className="size-3.5 shrink-0"
                                                    aria-hidden="true"
                                                />
                                                <span>Remover</span>
                                            </StoreButton>
                                        </div>
                                    }
                                />
                            );
                        })}
                    </div>
                )}
            </section>
        </>
    );
}

AccountWishlist.layout = {
    title: 'Lista de desejos',
    breadcrumbs: [
        {
            title: 'Resumo da conta',
            href: dashboard(),
        },
        {
            title: 'Lista de desejos',
            href: wishlistIndex(),
        },
    ],
};
