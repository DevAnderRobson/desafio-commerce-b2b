import { Head, Link, router, usePage } from '@inertiajs/react';
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { StoreButton } from '@/components/button';
import { CouponField } from '@/components/checkout/coupon-field';
import { formatDeliveryEstimate } from '@/components/checkout/freight-options';
import {
    OrderAddressSummary,
    OrderItemsSummary,
} from '@/components/checkout/order-items-summary';
import {
    formatPercentPtBR,
    PaymentTermOptions,
} from '@/components/checkout/payment-term-options';
import { storeToast } from '@/components/toast';
import CheckoutLayout from '@/layouts/checkout-layout';
import { formatCentsToBRL, formatInteger } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CheckoutPaymentProps, PaymentTermOption } from '@/types/order';

function resolveInitialSelectedTermCode(
    paymentTerms: PaymentTermOption[],
    selectedTermCode: string | null,
): string | null {
    if (selectedTermCode !== null) {
        const matching = paymentTerms.find(
            (term) => term.code === selectedTermCode && term.available,
        );
        if (matching) {
            return matching.code;
        }
    }

    return paymentTerms.find((term) => term.available)?.code ?? null;
}

function collectServerErrorMessages(
    ...sources: Array<Record<string, string | undefined> | null | undefined>
): string[] {
    const seen = new Set<string>();
    const keys = ['order', 'payment_term_code', 'idempotency_key'];

    for (const source of sources) {
        if (!source) {
            continue;
        }

        for (const key of keys) {
            const val = source[key];
            if (typeof val === 'string' && val.trim() !== '') {
                seen.add(val.trim());
            }
        }

        for (const val of Object.values(source)) {
            if (typeof val === 'string' && val.trim() !== '') {
                seen.add(val.trim());
            }
        }
    }

    return Array.from(seen);
}

type PaymentSidebarSummaryProps = {
    summary: CheckoutPaymentProps['summary'];
    freight: CheckoutPaymentProps['freight'];
    selectedTerm: PaymentTermOption | null;
    hasAvailableTerms: boolean;
    isSubmitting: boolean;
    errorMessages: string[];
    deliveryHref: string;
    cartHref: string;
    onConfirm: () => void;
};

function PaymentSidebarSummary({
    summary,
    freight,
    selectedTerm,
    hasAvailableTerms,
    isSubmitting,
    errorMessages,
    deliveryHref,
    cartHref,
    onConfirm,
}: PaymentSidebarSummaryProps) {
    const headingId = useId();
    const errorAlertId = useId();
    const unavailableHintId = useId();

    const isFreeShipping = freight.isFree || summary.totals.shippingCents === 0;
    const freightEstimate = formatDeliveryEstimate({
        code: 'selected',
        ...freight,
    });

    const displayedTotalCents =
        selectedTerm !== null
            ? selectedTerm.totalCents
            : summary.totals.subtotalCents + summary.totals.shippingCents;

    const canConfirm =
        hasAvailableTerms &&
        selectedTerm !== null &&
        selectedTerm.available &&
        !isSubmitting;

    return (
        <div
            aria-labelledby={headingId}
            className="flex flex-col gap-5 rounded-lg border border-border bg-card p-5 text-card-foreground sm:p-6"
        >
            <div className="flex items-baseline justify-between gap-2">
                <h2
                    id={headingId}
                    className="text-fluid-lg font-semibold tracking-tight text-foreground"
                >
                    Resumo do pedido
                </h2>
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                    {formatInteger(summary.items.length)}{' '}
                    {summary.items.length === 1 ? 'item' : 'itens'} (
                    {formatInteger(summary.count)}{' '}
                    {summary.count === 1 ? 'un.' : 'un.'})
                </span>
            </div>

            <div className="border-t border-b border-border py-3">
                <OrderItemsSummary
                    items={summary.items}
                    totalUnits={summary.count}
                    collapsibleOnMobile
                    defaultMobileOpen={false}
                />
            </div>

            {/* Campo visual de cupom desativado (D20) */}
            <CouponField />

            {/* Detalhamento de valores (sempre vindos do servidor, sem recálculo de negócio) */}
            <dl className="flex flex-col gap-3 border-t border-border pt-4 text-sm tabular-nums">
                <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">
                        Subtotal ({formatInteger(summary.count)}{' '}
                        {summary.count === 1 ? 'unidade' : 'unidades'})
                    </dt>
                    <dd className="font-medium text-foreground">
                        {formatCentsToBRL(summary.totals.subtotalCents)}
                    </dd>
                </div>

                <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">
                        Economia (atacado / promoção)
                    </dt>
                    <dd
                        className={cn(
                            'font-semibold',
                            summary.totals.savingsCents > 0
                                ? 'text-success-muted-foreground'
                                : 'font-normal text-muted-foreground',
                        )}
                    >
                        {summary.totals.savingsCents > 0
                            ? `- ${formatCentsToBRL(summary.totals.savingsCents)}`
                            : formatCentsToBRL(0)}
                    </dd>
                </div>

                <div className="flex items-start justify-between gap-4">
                    <dt className="flex flex-col text-muted-foreground">
                        <span>Frete ({freight.label})</span>
                        <span className="text-xs text-muted-foreground">
                            Prazo: {freightEstimate}
                        </span>
                    </dt>
                    <dd
                        className={cn(
                            'shrink-0 font-medium',
                            isFreeShipping
                                ? 'font-semibold text-success-muted-foreground'
                                : 'text-foreground',
                        )}
                    >
                        {isFreeShipping
                            ? 'Grátis'
                            : formatCentsToBRL(summary.totals.shippingCents)}
                    </dd>
                </div>

                <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">
                        Acréscimo
                        {selectedTerm ? ` (${selectedTerm.label})` : ''}
                        {selectedTerm && selectedTerm.surchargePercent > 0
                            ? ` · +${formatPercentPtBR(selectedTerm.surchargePercent)}`
                            : ''}
                    </dt>
                    <dd
                        className={cn(
                            'font-medium',
                            selectedTerm === null
                                ? 'text-muted-foreground'
                                : selectedTerm.surchargeCents > 0
                                  ? 'text-foreground'
                                  : 'text-success-muted-foreground',
                        )}
                    >
                        {selectedTerm === null
                            ? '—'
                            : selectedTerm.surchargeCents > 0
                              ? `+ ${formatCentsToBRL(selectedTerm.surchargeCents)}`
                              : 'Sem acréscimo'}
                    </dd>
                </div>

                <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
                    <dt className="text-base font-semibold text-foreground">
                        Total do pedido
                    </dt>
                    <dd
                        aria-live="polite"
                        aria-atomic="true"
                        className="text-fluid-2xl font-bold tracking-tight text-foreground"
                    >
                        {formatCentsToBRL(displayedTotalCents)}
                    </dd>
                </div>
            </dl>

            {errorMessages.length > 0 && (
                <div
                    id={errorAlertId}
                    role="alert"
                    aria-live="assertive"
                    className="flex items-start gap-2.5 rounded-md border border-destructive/40 bg-destructive/10 p-3.5 text-sm text-destructive"
                >
                    <AlertCircle
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden="true"
                    />
                    <div className="flex flex-col gap-1">
                        {errorMessages.map((msg) => (
                            <p key={msg} className="font-medium">
                                {msg}
                            </p>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-3 pt-1">
                <StoreButton
                    type="button"
                    variant="brand"
                    size="lg"
                    disabled={!canConfirm}
                    loading={isSubmitting}
                    loadingText="Confirmando pedido..."
                    onClick={onConfirm}
                    aria-describedby={
                        errorMessages.length > 0
                            ? errorAlertId
                            : !canConfirm
                              ? unavailableHintId
                              : undefined
                    }
                    className="w-full font-semibold"
                >
                    <CheckCircle2
                        className="size-4 shrink-0"
                        aria-hidden="true"
                    />
                    <span>Confirmar pedido</span>
                </StoreButton>

                {!hasAvailableTerms ? (
                    <p
                        id={unavailableHintId}
                        role="status"
                        className="text-xs font-medium text-muted-foreground"
                    >
                        Nenhuma condição de pagamento está disponível para
                        concluir este pedido.
                    </p>
                ) : (
                    selectedTerm === null && (
                        <p
                            id={unavailableHintId}
                            role="status"
                            className="text-xs font-medium text-muted-foreground"
                        >
                            Selecione uma condição de pagamento disponível para
                            confirmar o pedido.
                        </p>
                    )
                )}

                <div className="flex flex-wrap items-center justify-center gap-4 pt-1">
                    <Link
                        href={deliveryHref}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-sm px-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                        <ArrowLeft
                            className="size-4 shrink-0"
                            aria-hidden="true"
                        />
                        <span>Voltar para entrega</span>
                    </Link>

                    <Link
                        href={cartHref}
                        className="inline-flex min-h-11 items-center rounded-sm px-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                        <span>Revisar carrinho</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}

type MobilePaymentBottomBarProps = {
    summary: CheckoutPaymentProps['summary'];
    selectedTerm: PaymentTermOption | null;
    hasAvailableTerms: boolean;
    isSubmitting: boolean;
    onConfirm: () => void;
};

function MobilePaymentBottomBar({
    summary,
    selectedTerm,
    hasAvailableTerms,
    isSubmitting,
    onConfirm,
}: MobilePaymentBottomBarProps) {
    const displayedTotalCents =
        selectedTerm !== null
            ? selectedTerm.totalCents
            : summary.totals.subtotalCents + summary.totals.shippingCents;

    const canConfirm =
        hasAvailableTerms &&
        selectedTerm !== null &&
        selectedTerm.available &&
        !isSubmitting;

    return (
        <div
            role="region"
            aria-label="Total e confirmação do pedido"
            className="store-container flex flex-col gap-2"
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-col">
                    <span className="truncate text-xs text-muted-foreground tabular-nums">
                        {selectedTerm
                            ? `${selectedTerm.label} · ${selectedTerm.surchargeCents > 0 ? `+${formatCentsToBRL(selectedTerm.surchargeCents)}` : 'Sem acréscimo'}`
                            : `Total (${formatInteger(summary.count)} un.)`}
                    </span>
                    <span
                        aria-live="polite"
                        aria-atomic="true"
                        className="text-base font-bold text-foreground tabular-nums"
                    >
                        {formatCentsToBRL(displayedTotalCents)}
                    </span>
                </div>

                <StoreButton
                    type="button"
                    variant="brand"
                    size="touch"
                    disabled={!canConfirm}
                    loading={isSubmitting}
                    loadingText="Confirmando..."
                    onClick={onConfirm}
                    className="shrink-0 font-semibold"
                >
                    <CheckCircle2
                        className="size-4 shrink-0"
                        aria-hidden="true"
                    />
                    <span>Confirmar pedido</span>
                </StoreButton>
            </div>
        </div>
    );
}

/**
 * Etapa de revisão e pagamento do checkout B2B (Onda 7 - item 7.1):
 * - Renderiza `<CheckoutLayout currentStep="payment">` diretamente (sem `setLayoutProps`).
 * - Revisão completa: endereço de entrega, frete escolhido com prazo, itens, economia e subtotal, com link "Alterar" para `routes.delivery`.
 * - Seleção de condição de pagamento em radio group acessível sem card dentro de card.
 * - Submissão idempotente (`payment_term_code` + `idempotency_key`) com bloqueio contra duplo envio.
 */
export default function CheckoutPaymentPage({
    summary,
    address,
    freight,
    paymentTerms,
    selectedTermCode,
    idempotencyKey,
    routes,
}: CheckoutPaymentProps) {
    const page = usePage<{ errors?: Record<string, string | undefined> }>();
    const [chosenTermCode, setChosenTermCode] = useState<string | null>(() =>
        resolveInitialSelectedTermCode(paymentTerms, selectedTermCode),
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitErrors, setSubmitErrors] = useState<
        Record<string, string | undefined>
    >({});
    const isSubmittingRef = useRef(false);

    const activeTerm = useMemo(() => {
        if (chosenTermCode !== null) {
            const found = paymentTerms.find(
                (term) => term.code === chosenTermCode && term.available,
            );
            if (found) {
                return found;
            }
        }

        const initial = resolveInitialSelectedTermCode(
            paymentTerms,
            selectedTermCode,
        );
        if (initial === null) {
            return null;
        }

        return (
            paymentTerms.find(
                (term) => term.code === initial && term.available,
            ) ?? null
        );
    }, [chosenTermCode, paymentTerms, selectedTermCode]);

    const hasAvailableTerms = useMemo(
        () => paymentTerms.some((term) => term.available),
        [paymentTerms],
    );

    const errorMessages = useMemo(
        () => collectServerErrorMessages(page.props.errors, submitErrors),
        [page.props.errors, submitErrors],
    );

    const handleSelectTerm = useCallback((code: string) => {
        setSubmitErrors({});
        setChosenTermCode(code);
    }, []);

    const handleConfirmOrder = useCallback(() => {
        if (
            isSubmittingRef.current ||
            isSubmitting ||
            !hasAvailableTerms ||
            activeTerm === null ||
            !activeTerm.available
        ) {
            return;
        }

        isSubmittingRef.current = true;
        setIsSubmitting(true);
        setSubmitErrors({});

        router.post(
            routes.confirm,
            {
                payment_term_code: activeTerm.code,
                idempotency_key: idempotencyKey,
            },
            {
                preserveScroll: true,
                onError: (errors) => {
                    setSubmitErrors(errors);
                    const messages = collectServerErrorMessages(errors);
                    const message =
                        messages[0] ??
                        'Não foi possível confirmar o pedido. Verifique os dados e tente novamente.';
                    storeToast.error(message);
                },
                onFinish: () => {
                    isSubmittingRef.current = false;
                    setIsSubmitting(false);
                },
            },
        );
    }, [
        activeTerm,
        hasAvailableTerms,
        idempotencyKey,
        isSubmitting,
        routes.confirm,
    ]);

    const summarySlot = useMemo(
        () => (
            <PaymentSidebarSummary
                summary={summary}
                freight={freight}
                selectedTerm={activeTerm}
                hasAvailableTerms={hasAvailableTerms}
                isSubmitting={isSubmitting}
                errorMessages={errorMessages}
                deliveryHref={routes.delivery}
                cartHref={routes.cart}
                onConfirm={handleConfirmOrder}
            />
        ),
        [
            activeTerm,
            errorMessages,
            freight,
            handleConfirmOrder,
            hasAvailableTerms,
            isSubmitting,
            routes.cart,
            routes.delivery,
            summary,
        ],
    );

    const mobileBottomBar = useMemo(
        () => (
            <MobilePaymentBottomBar
                summary={summary}
                selectedTerm={activeTerm}
                hasAvailableTerms={hasAvailableTerms}
                isSubmitting={isSubmitting}
                onConfirm={handleConfirmOrder}
            />
        ),
        [
            activeTerm,
            handleConfirmOrder,
            hasAvailableTerms,
            isSubmitting,
            summary,
        ],
    );

    return (
        <CheckoutLayout
            currentStep="payment"
            backHref={routes.delivery}
            backLabel="Voltar para entrega"
            summarySlot={summarySlot}
            mobileBottomBar={mobileBottomBar}
        >
            <Head title="Pagamento" />

            <div className="flex flex-col gap-8 lg:gap-10">
                <header className="flex flex-col gap-1.5 border-b border-border pb-4">
                    <h1 className="font-semibold tracking-tight text-foreground">
                        Revisão e pagamento
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Confira os dados de entrega, os valores do pedido e
                        escolha a condição de pagamento da sua empresa.
                    </p>
                </header>

                <OrderAddressSummary
                    address={address}
                    freight={freight}
                    editHref={routes.delivery}
                    editLabel="Alterar"
                />

                <PaymentTermOptions
                    terms={paymentTerms}
                    selectedTermCode={activeTerm?.code ?? null}
                    onSelectTerm={handleSelectTerm}
                    disabled={isSubmitting}
                    errorMessage={
                        submitErrors.payment_term_code ??
                        page.props.errors?.payment_term_code ??
                        null
                    }
                    emptyReturnHref={routes.delivery}
                    emptyReturnLabel="Voltar para entrega"
                />
            </div>
        </CheckoutLayout>
    );
}
