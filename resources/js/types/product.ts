import type { ProductPriceState } from '@/types/store';

/**
 * Contrato da página de detalhe do produto (onda 4).
 * O backend (ProductController) é a única fonte; o preço só vem em `priceState.status === 'available'`.
 */

export type ProductImageData = {
    id: number;
    /** URL da imagem em tamanho de galeria. */
    url: string;
    /** URL da imagem em alta resolução para o zoom (pode ser igual a `url`). */
    zoomUrl: string;
    alt: string;
};

export type ProductSpecification = {
    name: string;
    value: string;
};

export type ProductAvailability = {
    status: 'in_stock' | 'low_stock' | 'out_of_stock';
    /** Unidades disponíveis para compra (limite máximo do seletor). */
    quantity: number;
    /** Limite que define "poucas unidades" (constante única do backend). */
    lowStockThreshold: number;
};

export type ProductDetail = {
    id: number;
    sku: string;
    ean: string | null;
    name: string;
    slug: string;
    brand: string;
    description: string | null;
    category: { name: string; href: string };
    /** URL canônica limpa, sem parâmetros (usada no compartilhar). */
    canonicalUrl: string;
    images: ProductImageData[];
    specifications: ProductSpecification[];
    availability: ProductAvailability;
    priceState: ProductPriceState;
    /** Validade da promoção (ISO 8601) quando houver promoção ativa. */
    promotionEndsAt: string | null;
    /** Usuário pode comprar: preço disponível e em estoque. */
    canPurchase: boolean;
    wishlisted: boolean;
};

export type ReviewBadge = 'purchased' | 'not_purchased';

export type ReviewData = {
    id: number;
    rating: number;
    title: string | null;
    body: string;
    authorName: string;
    /** Selo calculado pelo sistema; nunca vem do formulário. */
    badge: ReviewBadge;
    createdAt: string;
    isOwn: boolean;
};

export type ReviewSummary = {
    average: number | null;
    total: number;
    /** Contagem por nota, índice 1..5. */
    distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
};

export type ReviewFilters = {
    onlyBuyers: boolean;
    sort: 'recent' | 'highest' | 'lowest';
};

export type ReviewsPagination = {
    data: ReviewData[];
    currentPage: number;
    lastPage: number;
    total: number;
    nextPageUrl: string | null;
    prevPageUrl: string | null;
};

export type ReviewPermission = {
    /** Pode enviar/editar avaliação (logado e empresa aprovada). */
    canReview: boolean;
    /** Motivo quando não pode: orientação exibida ao usuário. */
    reason: 'guest' | 'pending_approval' | null;
    /** Avaliação existente do usuário, para edição. */
    own: { rating: number; title: string | null; body: string } | null;
};

export type ProductPageProps = {
    product: ProductDetail;
    /** Deferred: carrega depois do conteúdo principal; exibir skeleton enquanto `undefined`. */
    reviews?: {
        summary: ReviewSummary;
        filters: ReviewFilters;
        list: ReviewsPagination;
        permission: ReviewPermission;
    };
};
