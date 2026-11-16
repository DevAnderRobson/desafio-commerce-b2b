import type { InertiaLinkProps } from '@inertiajs/react';
import type { MiniCartData } from '@/types/cart';

export type MiniCartProps = {
    /** Destino do link principal do botão do carrinho (padrão: `cart.show().url`). */
    cartHref?: NonNullable<InertiaLinkProps['href']>;
    /** Total de unidades no carrinho exibido pelo `CartBadge`. */
    cartCount: number;
    /** Dados opcionais do mini carrinho; quando omitido, lê `usePage().props.miniCart`. */
    miniCart?: MiniCartData | null;
    className?: string;
};
