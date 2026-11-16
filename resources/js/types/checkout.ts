import type { CartItemData, CartTotalsData } from '@/types/cart';

/**
 * Contrato da etapa de entrega do checkout (onda 6), produzido por `CheckoutController`.
 * Endereços são da EMPRESA do usuário; o frete é simulado; cupom NÃO existe (só campo visual).
 */

export type AddressData = {
    id: number;
    /** Apelido opcional (ex.: "Matriz", "Depósito"). */
    label: string | null;
    cep: string; // "87020-000"
    street: string;
    number: string;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string; // UF, 2 letras maiúsculas
    /** Ordem de exibição: o último usado vem primeiro. */
    lastUsedAt: string | null;
};

/** Corpo de POST/PUT dos endereços (mesmos nomes de campo do backend). */
export type AddressFormData = {
    label: string;
    cep: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
};

export type FreightOption = {
    code: string;
    label: string;
    priceCents: number;
    /** Prazo em dias úteis. */
    deliveryDaysMin: number;
    deliveryDaysMax: number;
    isFree: boolean;
};

export type FreightQuote = {
    options: FreightOption[];
    /** Preenchido quando o cálculo falhou (UF inválida, serviço indisponível): exibir erro com "Tentar novamente". */
    error: string | null;
};

export type CheckoutItemSummary = Pick<
    CartItemData,
    | 'id'
    | 'name'
    | 'href'
    | 'imageUrl'
    | 'imageAlt'
    | 'quantity'
    | 'unitPriceCents'
    | 'lineTotalCents'
>;

export type CheckoutDeliveryProps = {
    summary: {
        items: CheckoutItemSummary[];
        count: number;
        /** Totais com o frete da opção selecionada já somado (shippingCents). */
        totals: CartTotalsData;
        /** Quanto falta para frete grátis (centavos), ou null se já tem/sem regra. */
        freeShippingMissingCents: number | null;
    };
    addresses: AddressData[];
    /** Último usado (ou o mais recente) vem pré-selecionado; null quando a empresa não tem endereço. */
    selectedAddressId: number | null;
    freight: FreightQuote | null;
    selectedFreightCode: string | null;
    /** Pode seguir para o pagamento (endereço + frete escolhidos). */
    canContinue: boolean;
    routes: {
        /** PUT {address_id, freight_code} grava a escolha e segue. */
        confirm: string;
        addressStore: string;
        /** Prefixo: PUT/DELETE em `${addressBase}/${address.id}`. */
        addressBase: string;
        /** GET `${cepLookup}/${cep só dígitos}` → JSON {cep, street, neighborhood, city, state} ou 404/422 {message}. */
        cepLookup: string;
        cart: string;
    };
};
