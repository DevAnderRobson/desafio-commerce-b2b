import { ProductCard, type ProductCardProps } from '@/components/product-card';
import { useQuickAddToCart } from '@/hooks/use-quick-add-to-cart';

/**
 * ProductCard ligado ao carrinho: cada clique em "Adicionar ao carrinho" soma 1 unidade
 * (quantidades maiores são escolhidas na página do produto ou no carrinho).
 */
export function QuickAddProductCard(props: ProductCardProps) {
    const { addToCart, isAdding } = useQuickAddToCart();

    return (
        <ProductCard
            {...props}
            onAddToCart={(productId) => addToCart(productId, props.name)}
            isAddingToCart={isAdding(props.id)}
        />
    );
}
