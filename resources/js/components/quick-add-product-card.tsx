import { usePage } from '@inertiajs/react';
import { ProductCard, type ProductCardProps } from '@/components/product-card';
import { WishlistButton } from '@/components/wishlist-button';
import { useQuickAddToCart } from '@/hooks/use-quick-add-to-cart';
import { login } from '@/routes';
import { destroy, store } from '@/routes/wishlist';
import type { User } from '@/types';

/**
 * ProductCard ligado ao carrinho e à lista de desejos:
 * - Cada clique em "Adicionar ao carrinho" soma 1 unidade
 *   (quantidades maiores são escolhidas na página do produto ou no carrinho).
 * - Renderiza o `WishlistButton` em modo `iconOnly` no `headerActionSlot` do card.
 */
export function QuickAddProductCard(props: ProductCardProps) {
    const { addToCart, isAdding } = useQuickAddToCart();
    const page = usePage();
    const user = (page.props.auth as { user?: User | null } | undefined)?.user;
    const isGuest = !user;
    const productId = Number(props.id);

    return (
        <ProductCard
            {...props}
            headerActionSlot={
                props.headerActionSlot ?? (
                    <WishlistButton
                        productId={props.id}
                        wishlisted={props.wishlisted ?? false}
                        isGuest={isGuest}
                        loginHref={login().url}
                        addHref={store(productId).url}
                        removeHref={destroy(productId).url}
                        productName={props.name}
                        iconOnly
                        className="border-border/80 bg-background/90 shadow-xs hover:bg-background"
                    />
                )
            }
            onAddToCart={(id) => addToCart(id, props.name)}
            isAddingToCart={isAdding(props.id)}
        />
    );
}
