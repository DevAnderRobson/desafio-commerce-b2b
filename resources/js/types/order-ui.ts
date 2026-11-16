import type { AddressData, CheckoutItemSummary } from '@/types/checkout';
import type {
    CheckoutPaymentProps,
    OrderStep,
    OrderTracking,
    PaymentTermOption,
} from '@/types/order';

export type PaymentTermOptionsProps = {
    terms: PaymentTermOption[];
    selectedTermCode: string | null;
    onSelectTerm: (code: string) => void;
    disabled?: boolean;
    errorMessage?: string | null;
    heading?: string;
    description?: string;
    emptyReturnHref?: string;
    emptyReturnLabel?: string;
    previousTermCode?: string | null;
};

export type OrderItemsSummaryProps = {
    items: CheckoutItemSummary[];
    totalUnits?: number;
    collapsibleOnMobile?: boolean;
    defaultMobileOpen?: boolean;
    maxHeightClassName?: string;
};

export type OrderAddressSummaryProps = {
    address: Pick<
        AddressData,
        | 'street'
        | 'number'
        | 'complement'
        | 'neighborhood'
        | 'city'
        | 'state'
        | 'cep'
    > & {
        label?: string | null;
    };
    freight?: CheckoutPaymentProps['freight'] | null;
    editHref?: string;
    editLabel?: string;
};

export type OrderStepsProps = {
    steps: OrderStep[];
    ariaLabel?: string;
};

export type OrderTotalsBreakdownProps = {
    totals: OrderTracking['totals'];
    paymentTermLabel?: string | null;
    freightLabel?: string | null;
    isFreeShipping?: boolean;
    totalUnits?: number;
    surchargePercent?: number | null;
};
