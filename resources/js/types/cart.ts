/**
 * Contrato do carrinho (onda 5). O backend é a única fonte de preços e totais:
 * o frontend nunca recalcula regra de negócio, apenas exibe e faz contas de apresentação
 * (ex.: stepper otimista) que o servidor reconcilia na resposta.
 */

/** Prop global compartilhada em todas as páginas (HandleInertiaRequests). */
export type SharedCart = {
    /** Soma de UNIDADES dos itens do carrinho do usuário logado (0 para visitantes). */
    count: number;
};

export type CartItemIssue =
    | 'inactive'
    | 'unavailable_for_model'
    | 'out_of_stock'
    | 'insufficient_stock';

export type CartPriceSource =
    | 'table'
    | 'wholesale'
    | 'promotion'
    | 'wholesale_promotion';

export type CartItemData = {
    id: number;
    productId: number;
    name: string;
    brand: string;
    sku: string;
    href: string;
    imageUrl: string | null;
    imageAlt: string;
    quantity: number;
    /** Máximo que o estoque permite agora (0 quando indisponível). */
    maxQuantity: number;
    unitPriceCents: number;
    /** Preço de tabela sem atacado/promoção (para exibir riscado quando diferente). */
    listUnitPriceCents: number;
    lineTotalCents: number;
    priceSource: CartPriceSource;
    promotionPercent: number | null;
    /** Quanto falta para o preço de atacado ("+12 un. para R$ 2,76 cada"); null se já aplicado ou sem atacado. */
    wholesaleHint: { missingUnits: number; unitPriceCents: number } | null;
    /** Item inválido: continua visível, sinalizado, e bloqueia o avanço até ser removido/ajustado. */
    issue: CartItemIssue | null;
    issueMessage: string | null;
    /** Mudança desde a última visita ao carrinho (preço ou estoque), para aviso. */
    changeNotice: string | null;
};

export type CartTotalsData = {
    subtotalCents: number;
    /** Economia total (atacado + promoção) frente ao preço de tabela. */
    savingsCents: number;
    /** Frete e acréscimo ficam 0 até o checkout (onda 6). */
    shippingCents: number;
    surchargeCents: number;
    totalCents: number;
};

export type CartBlocker =
    | 'item_issue'
    | 'customer_blocked'
    | 'customer_not_approved'
    | 'credit_limit_exceeded';

export type CartView = {
    items: CartItemData[];
    /** Unidades (mesmo valor de SharedCart.count). */
    count: number;
    totals: CartTotalsData;
    /** Pode seguir para a entrega. Falso quando houver bloqueios. */
    canProceed: boolean;
    blockers: { type: CartBlocker; message: string }[];
};

export type CartRoutes = {
    /** POST {productId, quantity} soma ao carrinho (também usado para "desfazer" remoção). */
    itemStore: string;
    /** Prefixo para PATCH/DELETE por item: `${itemBase}/${item.id}`. PATCH body: {quantity}. */
    itemBase: string;
    /** DELETE esvazia o carrinho. */
    clear: string;
    /** GET da próxima etapa (entrega, onda 6). */
    checkout: string;
    /** GET da loja (estado vazio). */
    shop: string;
};

export type CartPageProps = {
    cart: CartView;
    routes: CartRoutes;
};

/** Mini carrinho do navbar. Prop compartilhada OPCIONAL (`miniCart`): só chega ao pedir `only: ['miniCart']`. */
export type MiniCartItem = {
    id: number;
    name: string;
    href: string;
    imageUrl: string | null;
    imageAlt: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
    /** Item indisponível (continua listado, sem valor). */
    hasIssue: boolean;
};

export type MiniCartData = {
    items: MiniCartItem[];
    /** Quantos itens existem além dos listados (a lista traz no máximo 5). */
    hiddenItemsCount: number;
    count: number;
    subtotalCents: number;
    /** Falso para quem não pode comprar (ex.: cadastro pendente). */
    canView: boolean;
};
