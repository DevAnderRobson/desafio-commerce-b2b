import type { ProductCardProps } from '@/components/product-card';
import type { AddressData } from '@/types/checkout';
import type { OrderStatusCode, OrderTracking } from '@/types/order';

/**
 * Contrato da área do cliente (onda 8.B), produzido pelos controllers em `App\Http\Controllers\Account`.
 * Pedidos e endereços são da EMPRESA; lista de desejos e carrinho são do USUÁRIO (D24).
 */

export type AccountCompany = {
    name: string;
    /** "Padrão" | "Atacadista" (modelo de compra definido pela tabela de preço); null sem tabela. */
    purchaseModel: string | null;
    approvalStatus: 'pending' | 'approved' | 'rejected';
    isBlocked: boolean;
    isOwner: boolean;
};

export type AccountCredit = {
    limitCents: number;
    usedCents: number;
    availableCents: number;
};

export type OrderListItem = {
    number: string;
    status: OrderStatusCode;
    statusLabel: string;
    outcome: OrderTracking['outcome'];
    createdAt: string;
    /** Soma de unidades. */
    unitCount: number;
    totalCents: number;
    /** Quem na empresa fez o pedido (primeiro nome + inicial). */
    placedBy: string;
    /** Detalhe: `/conta/pedidos/{number}`. */
    href: string;
};

export type AccountDashboardProps = {
    /**
     * null para usuários sem empresa (ex.: contas legadas). Chama-se `accountCompany` (e não
     * `company`) para não sobrescrever a prop global compartilhada `company`.
     */
    accountCompany: AccountCompany | null;
    /** null quando a empresa não está aprovada. */
    credit: AccountCredit | null;
    recentOrders: OrderListItem[];
    counts: { orders: number; addresses: number; wishlist: number };
    routes: {
        orders: string;
        addresses: string;
        wishlist: string;
        /** null para quem não é dono da empresa. */
        users: string | null;
        settings: string;
        shop: string;
    };
};

export type OrderFilterValue =
    | 'all'
    | 'awaiting_payment'
    | 'in_progress'
    | 'delivered'
    | 'not_completed';

export type AccountOrdersProps = {
    orders: {
        data: OrderListItem[];
        currentPage: number;
        lastPage: number;
        total: number;
        nextPageUrl: string | null;
        prevPageUrl: string | null;
    };
    filter: OrderFilterValue;
    /** Contagem por filtro (todas as chaves sempre presentes). */
    filters: { value: OrderFilterValue; label: string; count: number }[];
    routes: {
        /** GET desta tela; filtro via `?status=` (use `router.get(self, { status }, ...)`). */
        self: string;
        shop: string;
    };
};

export type AccountOrderShowProps = {
    order: OrderTracking & { placedBy: string };
    routes: {
        list: string;
        /** POST repete o pedido: adiciona ao carrinho do usuário respeitando preço/estoque atuais e redireciona ao carrinho. */
        repeat: string;
        /** Página de resultado/retentativa de pagamento (quando `order.canRetryPayment` ou pedido pendente). */
        payment: string;
    };
};

export type AccountAddressesProps = {
    addresses: AddressData[];
    routes: {
        /** POST cria; PUT/DELETE em `${base}/${address.id}`. */
        store: string;
        base: string;
        /** GET `${cepLookup}/${cep}` → JSON (mesmo contrato da etapa de entrega). */
        cepLookup: string;
    };
};

export type WishlistProduct = Pick<
    ProductCardProps,
    | 'id'
    | 'sku'
    | 'name'
    | 'brand'
    | 'slug'
    | 'href'
    | 'categoryName'
    | 'imageUrl'
    | 'imageAlt'
    | 'inStock'
    | 'stockQuantity'
    | 'priceState'
    | 'showAddToCart'
>;

export type AccountWishlistProps = {
    products: WishlistProduct[];
    routes: {
        /** POST `${moveBase}/${product.id}/mover`: adiciona 1 un. ao carrinho e remove da lista. */
        moveBase: string;
        /** DELETE `${removeBase}/${product.id}` remove da lista. */
        removeBase: string;
        shop: string;
    };
};
