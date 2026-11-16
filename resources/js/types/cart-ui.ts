import type { CartItemData } from '@/types/cart';

export type CartBadgeProps = {
    /** Quantidade total de unidades no carrinho (0 oculta o badge visual). */
    count: number;
    /** Quando falso, omite a região aria-live duplicada (ex.: segundo link no drawer mobile). */
    announceChanges?: boolean;
    className?: string;
};

export type RemovedCartItemSnapshot = {
    itemId: number;
    productId: number;
    name: string;
    sku: string;
    quantity: number;
};

export type CartItemRowProps = {
    item: CartItemData;
    displayQuantity: number;
    rawQuantity: string;
    isOptimistic: boolean;
    isSyncing: boolean;
    isRemoving: boolean;
    errorMessage: string | null;
    onStepQuantity: (item: CartItemData, delta: number) => void;
    onInputQuantityChange: (item: CartItemData, rawValue: string) => void;
    onInputQuantityBlur: (item: CartItemData) => void;
    onRemove: (item: CartItemData) => void;
};
