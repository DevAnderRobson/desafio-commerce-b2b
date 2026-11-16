import type { AddressData, CheckoutItemSummary } from '@/types/checkout';
import type { CartTotalsData } from '@/types/cart';

/**
 * Contrato das telas de pagamento e acompanhamento do pedido (onda 7).
 * Totais e disponibilidade das condições de pagamento vêm SEMPRE do servidor; o cliente só exibe.
 */

export type PaymentTermOption = {
    code: string;
    label: string;
    /** Ex.: "Boleto 28 dias". */
    description: string;
    /** Percentual de acréscimo (ex.: 2.5). */
    surchargePercent: number;
    /** Acréscimo calculado sobre subtotal + frete. */
    surchargeCents: number;
    /** Total do pedido se esta condição for escolhida (já com acréscimo). */
    totalCents: number;
    isDeferred: boolean;
    available: boolean;
    /** Motivo quando indisponível (valor mínimo, limite de crédito insuficiente). Sempre pt-BR. */
    unavailableReason: string | null;
    /** Crédito disponível da empresa (só para condições a prazo), para explicar o bloqueio. */
    availableCreditCents: number | null;
};

export type CheckoutPaymentProps = {
    summary: {
        items: CheckoutItemSummary[];
        count: number;
        /** Sem acréscimo: o acréscimo depende da condição escolhida (veja `paymentTerms`). */
        totals: Pick<
            CartTotalsData,
            'subtotalCents' | 'savingsCents' | 'shippingCents'
        >;
    };
    address: AddressData;
    freight: {
        label: string;
        priceCents: number;
        deliveryDaysMin: number;
        deliveryDaysMax: number;
        isFree: boolean;
    };
    paymentTerms: PaymentTermOption[];
    /** Primeira condição disponível (PIX normalmente); null se nenhuma estiver disponível. */
    selectedTermCode: string | null;
    /** Gerada ao abrir a etapa; enviada no confirmar para evitar pedido duplicado. */
    idempotencyKey: string;
    routes: {
        /** POST {payment_term_code, idempotency_key} cria o pedido e redireciona ao acompanhamento. */
        confirm: string;
        delivery: string;
        cart: string;
    };
};

export type OrderStatusCode =
    | 'pending_payment'
    | 'paid'
    | 'picking'
    | 'shipped'
    | 'delivered'
    | 'payment_refused'
    | 'payment_failed'
    | 'expired'
    | 'cancelled';

export type OrderStepState = 'done' | 'current' | 'pending' | 'failed';

export type OrderStep = {
    key: 'received' | 'payment' | 'confirmed';
    label: string;
    state: OrderStepState;
};

export type OrderTracking = {
    number: string;
    status: OrderStatusCode;
    /** Rótulo pt-BR do status (ex.: "Aguardando pagamento"). */
    statusLabel: string;
    /** Estado final do pagamento: a tela de acompanhamento redireciona para a confirmação. */
    isPaymentFinal: boolean;
    outcome:
        | 'processing'
        | 'paid'
        | 'refused'
        | 'failed'
        | 'expired'
        | 'cancelled';
    createdAt: string;
    items: CheckoutItemSummary[];
    totals: CartTotalsData;
    address: Pick<
        AddressData,
        | 'street'
        | 'number'
        | 'complement'
        | 'neighborhood'
        | 'city'
        | 'state'
        | 'cep'
    >;
    paymentTerm: { code: string; label: string };
    steps: OrderStep[];
    /** Pagamento recusado/falhou/expirou: pode tentar outra condição sem refazer o pedido. */
    canRetryPayment: boolean;
    /** Condições disponíveis para uma nova tentativa (com total recalculado). */
    retryTerms: PaymentTermOption[];
};

export type OrderProcessingProps = {
    order: OrderTracking;
    polling: {
        /** Intervalos crescentes em ms entre consultas (o último se repete). */
        intervalsMs: number[];
        /** Após este tempo, mostrar orientação "avisaremos por e-mail" e parar o polling. */
        timeoutMinutes: number;
    };
    routes: {
        /** GET desta mesma tela (use para `router.reload({ only: ['order'] })`). */
        self: string;
        orders: string;
        home: string;
    };
};

export type OrderConfirmationProps = {
    order: OrderTracking;
    routes: {
        /** POST {payment_term_code, idempotency_key} para nova tentativa de pagamento. */
        retry: string;
        orders: string;
        home: string;
    };
    /** Chave de idempotência para a nova tentativa (gerada pelo servidor). */
    retryIdempotencyKey: string | null;
};
