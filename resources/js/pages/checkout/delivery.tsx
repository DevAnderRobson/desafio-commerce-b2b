import { Head, router, usePage } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { StoreButton } from '@/components/button';
import { AddressPicker } from '@/components/checkout/address-picker';
import { FreightOptions } from '@/components/checkout/freight-options';
import { OrderSummary } from '@/components/checkout/order-summary';
import { storeToast } from '@/components/toast';
import CheckoutLayout from '@/layouts/checkout-layout';
import { formatCentsToBRL, formatInteger } from '@/lib/format';
import type { CheckoutDeliveryProps, FreightOption } from '@/types/checkout';

const DELIVERY_PARTIAL_PROPS = [
    'freight',
    'selectedAddressId',
    'selectedFreightCode',
    'summary',
    'canContinue',
];

function resolveCannotContinueReason(
    props: Pick<
        CheckoutDeliveryProps,
        'addresses' | 'selectedAddressId' | 'freight' | 'selectedFreightCode'
    >,
): string {
    if (props.addresses.length === 0) {
        return 'Cadastre o endereço de entrega da sua empresa para calcular o frete.';
    }

    if (props.selectedAddressId === null) {
        return 'Selecione um endereço de entrega para calcular o frete.';
    }

    if (props.freight?.error) {
        return 'Não foi possível validar o frete para este endereço. Tente recalcular ou escolha outro endereço.';
    }

    if (props.selectedFreightCode === null) {
        return 'Selecione uma modalidade de frete para prosseguir para o pagamento.';
    }

    return 'Confirme o endereço e a opção de frete para avançar para o pagamento.';
}

function findSelectedFreightOption(
    freight: CheckoutDeliveryProps['freight'],
    selectedFreightCode: string | null,
): FreightOption | null {
    if (!freight || !selectedFreightCode) {
        return null;
    }

    return (
        freight.options.find((option) => option.code === selectedFreightCode) ??
        null
    );
}

type MobileDeliveryBottomBarProps = {
    summary: CheckoutDeliveryProps['summary'];
    selectedFreightOption: FreightOption | null;
    canContinue: boolean;
    cannotContinueReason: string;
    isRecalculating: boolean;
    isConfirming: boolean;
    onConfirm: () => void;
};

function MobileDeliveryBottomBar({
    summary,
    selectedFreightOption,
    canContinue,
    cannotContinueReason,
    isRecalculating,
    isConfirming,
    onConfirm,
}: MobileDeliveryBottomBarProps) {
    const isFreeShipping =
        selectedFreightOption !== null &&
        (selectedFreightOption.isFree || summary.totals.shippingCents === 0);
    const isDisabled = !canContinue || isRecalculating || isConfirming;

    return (
        <div
            role="region"
            aria-label="Total do pedido e avanço para pagamento"
            className="store-container flex flex-col gap-2"
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-col">
                    <span className="truncate text-xs text-muted-foreground tabular-nums">
                        Total ({formatInteger(summary.count)}{' '}
                        {summary.count === 1 ? 'un.' : 'un.'}) ·{' '}
                        {isRecalculating
                            ? 'Calculando frete...'
                            : selectedFreightOption === null
                              ? 'Frete a calcular'
                              : isFreeShipping
                                ? 'Frete grátis'
                                : `Frete ${formatCentsToBRL(summary.totals.shippingCents)}`}
                    </span>
                    <span
                        aria-live="polite"
                        aria-atomic="true"
                        className="text-base font-bold text-foreground tabular-nums"
                    >
                        {formatCentsToBRL(summary.totals.totalCents)}
                    </span>
                </div>

                <StoreButton
                    type="button"
                    variant="brand"
                    size="touch"
                    disabled={isDisabled}
                    loading={isConfirming}
                    loadingText="Confirmando..."
                    onClick={onConfirm}
                    className="shrink-0 font-semibold"
                >
                    <span>Continuar para pagamento</span>
                    <ArrowRight
                        className="size-4 shrink-0"
                        aria-hidden="true"
                    />
                </StoreButton>
            </div>

            {!canContinue && (
                <p className="truncate text-xs font-medium text-muted-foreground">
                    {cannotContinueReason}
                </p>
            )}
        </div>
    );
}

/**
 * Etapa de entrega do checkout B2B (Onda 6):
 * - Usa `CheckoutLayout` (aplicado automaticamente em `app.tsx` para `checkout/*`) com `currentStep="shipping"`.
 * - Endereço inline: formulário direto na tela quando a empresa não possui endereços,
 *   ou lista em grupo de radio acessível com o último usado pré-selecionado, Sheet para novo/edição
 *   e Dialog de confirmação para remoção.
 * - Frete: opções em radio com recálculo via `router.get` parcial ao trocar endereço ou modalidade.
 * - Campo de cupom de desconto somente visual e desativado ("Em breve").
 * - Resumo do pedido fixo no desktop (`summarySlot`) e recolhível no mobile com barra inferior fixa (`mobileBottomBar`).
 */
export default function CheckoutDeliveryPage({
    summary,
    addresses,
    selectedAddressId,
    freight,
    selectedFreightCode,
    canContinue,
    routes,
}: CheckoutDeliveryProps) {
    const page = usePage();
    const currentPath = useMemo(
        () => page.url.split('?')[0] || '/checkout/entrega',
        [page.url],
    );

    const [isLoadingFreight, setIsLoadingFreight] = useState(false);
    const [isRecalculating, setIsRecalculating] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [confirmError, setConfirmError] = useState<string | null>(null);

    const selectedFreightOption = useMemo(
        () => findSelectedFreightOption(freight, selectedFreightCode),
        [freight, selectedFreightCode],
    );

    const cannotContinueReason = useMemo(
        () =>
            resolveCannotContinueReason({
                addresses,
                selectedAddressId,
                freight,
                selectedFreightCode,
            }),
        [addresses, freight, selectedAddressId, selectedFreightCode],
    );

    const handleSelectAddress = useCallback(
        (addressId: number) => {
            if (
                addressId === selectedAddressId &&
                freight !== null &&
                freight.error === null
            ) {
                return;
            }

            setConfirmError(null);
            setIsLoadingFreight(true);
            setIsRecalculating(true);

            router.get(
                currentPath,
                { address: addressId },
                {
                    only: DELIVERY_PARTIAL_PROPS,
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    onError: () => {
                        storeToast.error(
                            'Não foi possível recalcular o frete para o endereço selecionado.',
                        );
                    },
                    onFinish: () => {
                        setIsLoadingFreight(false);
                        setIsRecalculating(false);
                    },
                },
            );
        },
        [currentPath, freight, selectedAddressId],
    );

    const handleRetryFreight = useCallback(() => {
        if (selectedAddressId === null) {
            return;
        }

        setConfirmError(null);
        setIsLoadingFreight(true);
        setIsRecalculating(true);

        router.get(
            currentPath,
            { address: selectedAddressId },
            {
                only: DELIVERY_PARTIAL_PROPS,
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onError: () => {
                    storeToast.error(
                        'Não foi possível consultar o frete neste momento. Tente novamente.',
                    );
                },
                onFinish: () => {
                    setIsLoadingFreight(false);
                    setIsRecalculating(false);
                },
            },
        );
    }, [currentPath, selectedAddressId]);

    const handleSelectFreight = useCallback(
        (freightCode: string) => {
            if (
                selectedAddressId === null ||
                freightCode === selectedFreightCode
            ) {
                return;
            }

            setConfirmError(null);
            setIsRecalculating(true);

            router.get(
                currentPath,
                {
                    address: selectedAddressId,
                    freight: freightCode,
                },
                {
                    only: DELIVERY_PARTIAL_PROPS,
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    onError: () => {
                        storeToast.error(
                            'Não foi possível atualizar a opção de frete selecionada.',
                        );
                    },
                    onFinish: () => {
                        setIsRecalculating(false);
                    },
                },
            );
        },
        [currentPath, selectedAddressId, selectedFreightCode],
    );

    const handleConfirmDelivery = useCallback(() => {
        if (
            !canContinue ||
            selectedAddressId === null ||
            selectedFreightCode === null ||
            isConfirming ||
            isRecalculating
        ) {
            return;
        }

        setConfirmError(null);
        setIsConfirming(true);

        router.put(
            routes.confirm,
            {
                address_id: selectedAddressId,
                freight_code: selectedFreightCode,
            },
            {
                preserveScroll: true,
                onError: (errors) => {
                    const message =
                        errors.freight_code ||
                        errors.address_id ||
                        'Escolha um endereço e uma opção de frete válidos para continuar.';
                    setConfirmError(message);
                    storeToast.error(message);
                },
                onFinish: () => {
                    setIsConfirming(false);
                },
            },
        );
    }, [
        canContinue,
        isConfirming,
        isRecalculating,
        routes.confirm,
        selectedAddressId,
        selectedFreightCode,
    ]);

    const summarySlot = useMemo(
        () => (
            <OrderSummary
                summary={summary}
                selectedFreightOption={selectedFreightOption}
                canContinue={canContinue}
                cannotContinueReason={cannotContinueReason}
                isRecalculating={isRecalculating}
                isConfirming={isConfirming}
                cartHref={routes.cart}
                confirmError={confirmError}
                onConfirm={handleConfirmDelivery}
            />
        ),
        [
            canContinue,
            cannotContinueReason,
            confirmError,
            handleConfirmDelivery,
            isConfirming,
            isRecalculating,
            routes.cart,
            selectedFreightOption,
            summary,
        ],
    );

    const mobileBottomBar = useMemo(
        () => (
            <MobileDeliveryBottomBar
                summary={summary}
                selectedFreightOption={selectedFreightOption}
                canContinue={canContinue}
                cannotContinueReason={cannotContinueReason}
                isRecalculating={isRecalculating}
                isConfirming={isConfirming}
                onConfirm={handleConfirmDelivery}
            />
        ),
        [
            canContinue,
            cannotContinueReason,
            handleConfirmDelivery,
            isConfirming,
            isRecalculating,
            selectedFreightOption,
            summary,
        ],
    );

    return (
        <CheckoutLayout
            currentStep="shipping"
            backHref={routes.cart}
            backLabel="Voltar ao carrinho"
            summarySlot={summarySlot}
            mobileBottomBar={mobileBottomBar}
        >
            <Head title="Entrega" />

            <div className="flex flex-col gap-8 lg:gap-10">
                <header className="flex flex-col gap-1.5 border-b border-border pb-4">
                    <h1 className="font-semibold tracking-tight text-foreground">
                        Entrega do pedido
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Confirme o endereço comercial da sua empresa e selecione
                        a modalidade de envio.
                    </p>
                </header>

                <AddressPicker
                    addresses={addresses}
                    selectedAddressId={selectedAddressId}
                    isSwitchingAddress={isLoadingFreight}
                    addressStoreUrl={routes.addressStore}
                    addressBaseUrl={routes.addressBase}
                    cepLookupUrl={routes.cepLookup}
                    onSelectAddress={handleSelectAddress}
                />

                <FreightOptions
                    freight={freight}
                    selectedFreightCode={selectedFreightCode}
                    hasSelectedAddress={
                        addresses.length > 0 && selectedAddressId !== null
                    }
                    freeShippingMissingCents={summary.freeShippingMissingCents}
                    isLoading={isLoadingFreight}
                    errorMessage={confirmError}
                    onSelectFreight={handleSelectFreight}
                    onRetry={handleRetryFreight}
                />
            </div>
        </CheckoutLayout>
    );
}
