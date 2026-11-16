import type {
    AddressData,
    CheckoutDeliveryProps,
    FreightOption,
    FreightQuote,
} from '@/types/checkout';

export type BrazilianStateOption = {
    code: string;
    name: string;
};

export type CepLookupPayload = {
    cep: string;
    street: string;
    neighborhood: string;
    city: string;
    state: string;
};

export type CepLookupState = 'idle' | 'loading' | 'resolved' | 'fallback';

export type AddressFormMode = 'inline' | 'sheet';

export type AddressFormProps = {
    mode: AddressFormMode;
    actionUrl: string;
    method: 'post' | 'put';
    cepLookupUrl: string;
    initialAddress?: AddressData | null;
    onSuccess?: () => void;
    onCancel?: () => void;
};

export type AddressPickerProps = {
    addresses: AddressData[];
    selectedAddressId: number | null;
    isSwitchingAddress: boolean;
    addressStoreUrl: string;
    addressBaseUrl: string;
    cepLookupUrl: string;
    onSelectAddress: (addressId: number) => void;
};

export type FreightOptionsProps = {
    freight: FreightQuote | null;
    selectedFreightCode: string | null;
    hasSelectedAddress: boolean;
    freeShippingMissingCents: number | null;
    isLoading: boolean;
    errorMessage?: string | null;
    onSelectFreight: (freightCode: string) => void;
    onRetry: () => void;
};

export type CouponFieldProps = {
    className?: string;
};

export type OrderSummaryProps = {
    summary: CheckoutDeliveryProps['summary'];
    selectedFreightOption: FreightOption | null;
    canContinue: boolean;
    cannotContinueReason: string;
    isRecalculating: boolean;
    isConfirming: boolean;
    cartHref: string;
    confirmError?: string | null;
    onConfirm: () => void;
};
