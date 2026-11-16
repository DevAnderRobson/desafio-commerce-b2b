import { router } from '@inertiajs/react';
import { useCallback, useState } from 'react';
import { storeToast } from '@/components/toast';
import { show as showCart } from '@/routes/cart';
import { store as storeCartItem } from '@/routes/cart/items';
import type { SharedCart } from '@/types/cart';

/**
 * Adição rápida de 1 unidade a partir de cards (home, carrosséis, busca).
 * - Contador do navbar sobe na hora (otimista) e é reconciliado pelo servidor.
 * - Feedback explícito: botão em "Adicionando...", toast "1 unidade adicionada" com atalho
 *   para o carrinho, e toast de erro com o motivo (ex.: limite de estoque).
 */
export function useQuickAddToCart() {
    const [pendingIds, setPendingIds] = useState<ReadonlySet<number | string>>(
        new Set(),
    );

    const setPending = useCallback(
        (productId: number | string, pending: boolean) => {
            setPendingIds((current) => {
                const next = new Set(current);

                if (pending) {
                    next.add(productId);
                } else {
                    next.delete(productId);
                }

                return next;
            });
        },
        [],
    );

    const addToCart = useCallback(
        (productId: number | string, productName?: string) => {
            if (pendingIds.has(productId)) {
                return;
            }

            setPending(productId, true);

            router
                .optimistic<{ cart?: SharedCart }>((props) => ({
                    cart: {
                        ...props.cart,
                        count: (props.cart?.count ?? 0) + 1,
                    },
                }))
                .post(
                    storeCartItem().url,
                    { product_id: Number(productId), quantity: 1 },
                    {
                        preserveScroll: true,
                        preserveState: true,
                        onSuccess: () => {
                            storeToast.success(
                                '1 unidade adicionada ao carrinho.',
                                {
                                    description: productName,
                                    recoveryAction: {
                                        label: 'Ver carrinho',
                                        onClick: () =>
                                            router.visit(showCart().url),
                                    },
                                },
                            );
                        },
                        onError: (errors) => {
                            storeToast.error(
                                errors.quantity ||
                                    errors.product_id ||
                                    'Não foi possível adicionar ao carrinho.',
                                { description: productName },
                            );
                        },
                        onFinish: () => setPending(productId, false),
                    },
                );
        },
        [pendingIds, setPending],
    );

    return {
        addToCart,
        isAdding: (productId: number | string) => pendingIds.has(productId),
    };
}
