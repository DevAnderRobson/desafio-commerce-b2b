import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    ArrowRight,
    Ban,
    CheckCircle2,
    Clock,
    CreditCard,
    PackageCheck,
    RefreshCw,
    ShoppingBag,
} from 'lucide-react';
import {
    useCallback,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
} from 'react';
import { StoreButton } from '@/components/button';
import {
    OrderAddressSummary,
    OrderItemsSummary,
    OrderTotalsBreakdown,
} from '@/components/checkout/order-items-summary';
import { OrderSteps } from '@/components/checkout/order-steps';
import { PaymentTermOptions } from '@/components/checkout/payment-term-options';
import { storeToast } from '@/components/toast';
import CheckoutLayout from '@/layouts/checkout-layout';
import { formatCentsToBRL, formatInteger } from '@/lib/format';
import { cn } from '@/lib/utils';
import type {
    OrderConfirmationProps,
    OrderTracking,
    PaymentTermOption,
} from '@/types/order';

function formatOrderDateTime(isoString: string): string {
    const parsed = new Date(isoString);
    if (Number.isNaN(parsed.getTime())) {
        return isoString;
    }

    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(parsed);
}

function resolveInitialRetryTermCode(
    retryTerms: PaymentTermOption[],
    previousCode: string,
): string | null {
    const alternativeAvailable = retryTerms.find(
        (term) => term.available && term.code !== previousCode,
    );
    if (alternativeAvailable) {
        return alternativeAvailable.code;
    }

    return retryTerms.find((term) => term.available)?.code ?? null;
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

type OutcomeMeta = {
    title: string;
    subtitle: string;
    badgeLabel: string;
    badgeClassName: string;
    headerBorderClassName: string;
};

function getOutcomeMeta(order: OrderTracking): OutcomeMeta {
    switch (order.outcome) {
        case 'paid':
            return {
                title: `Pagamento aprovado — pedido #${order.number} confirmado`,
                subtitle: `Recebemos a confirmação do pagamento via ${order.paymentTerm.label}. Seu pedido já seguiu para separação e faturamento.`,
                badgeLabel: order.statusLabel || 'Pago',
                badgeClassName:
                    'border-success/35 bg-success-muted text-success-muted-foreground',
                headerBorderClassName: 'border-border',
            };
        case 'refused':
            return {
                title: `Pagamento recusado no pedido #${order.number}`,
                subtitle: order.canRetryPayment
                    ? `A tentativa na condição ${order.paymentTerm.label} não foi autorizada. Os itens do seu pedido permanecem reservados para que você escolha outra condição de pagamento abaixo sem precisar refazer o pedido.`
                    : `A tentativa de pagamento na condição ${order.paymentTerm.label} não foi autorizada para este pedido.`,
                badgeLabel: order.statusLabel || 'Pagamento recusado',
                badgeClassName:
                    'border-destructive/40 bg-destructive/10 text-destructive',
                headerBorderClassName: 'border-destructive/35',
            };
        case 'failed':
            return {
                title: `Não foi possível concluir o pagamento do pedido #${order.number}`,
                subtitle: order.canRetryPayment
                    ? `Ocorreu uma falha técnica ao processar o pagamento via ${order.paymentTerm.label}. Escolha outra condição abaixo ou tente novamente sem refazer o pedido.`
                    : `Ocorreu uma falha definitiva ao processar o pagamento deste pedido.`,
                badgeLabel: order.statusLabel || 'Falha no pagamento',
                badgeClassName:
                    'border-destructive/40 bg-destructive/10 text-destructive',
                headerBorderClassName: 'border-destructive/35',
            };
        case 'expired':
            return {
                title: `Prazo de pagamento expirado para o pedido #${order.number}`,
                subtitle: order.canRetryPayment
                    ? `O tempo limite para concluir o pagamento na condição ${order.paymentTerm.label} expirou. Selecione uma condição disponível abaixo para concluir este pedido.`
                    : `O tempo limite para pagamento deste pedido foi encerrado e as reservas foram liberadas.`,
                badgeLabel: order.statusLabel || 'Expirado',
                badgeClassName:
                    'border-warning/40 bg-warning-muted text-warning-muted-foreground',
                headerBorderClassName: 'border-warning/40',
            };
        case 'processing':
            return {
                title: `Pagamento do pedido #${order.number} em processamento`,
                subtitle: `A confirmação do pagamento via ${order.paymentTerm.label} ainda está em andamento. Você pode voltar ao acompanhamento em tempo real ou consultar seus pedidos.`,
                badgeLabel: order.statusLabel || 'Em processamento',
                badgeClassName:
                    'border-brand/35 bg-brand-muted text-brand-muted-foreground',
                headerBorderClassName: 'border-border',
            };
        case 'cancelled':
        default:
            return {
                title: `Pedido #${order.number} cancelado`,
                subtitle: `Este pedido foi cancelado e nenhuma cobrança será faturada para a sua empresa.`,
                badgeLabel: order.statusLabel || 'Cancelado',
                badgeClassName: 'border-border bg-muted text-muted-foreground',
                headerBorderClassName: 'border-border',
            };
    }
}

function OutcomeIcon({ outcome }: { outcome: OrderTracking['outcome'] }) {
    switch (outcome) {
        case 'paid':
            return (
                <CheckCircle2
                    className="size-6 shrink-0 text-success"
                    aria-hidden="true"
                />
            );
        case 'refused':
        case 'failed':
            return (
                <AlertTriangle
                    className="size-6 shrink-0 text-destructive"
                    aria-hidden="true"
                />
            );
        case 'expired':
            return (
                <AlertCircle
                    className="size-6 shrink-0 text-warning-muted-foreground"
                    aria-hidden="true"
                />
            );
        case 'processing':
            return (
                <Clock
                    className="size-6 shrink-0 text-brand"
                    aria-hidden="true"
                />
            );
        case 'cancelled':
        default:
            return (
                <Ban
                    className="size-6 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                />
            );
    }
}

type ConfirmationSidebarSummaryProps = {
    order: OrderTracking;
    selectedRetryTerm: PaymentTermOption | null;
    isRetryEligible: boolean;
    hasAvailableRetryTerms: boolean;
    isRetrying: boolean;
    errorMessages: string[];
    ordersHref: string;
    homeHref: string;
    onRetry: () => void;
};

function ConfirmationSidebarSummary({
    order,
    selectedRetryTerm,
    isRetryEligible,
    hasAvailableRetryTerms,
    isRetrying,
    errorMessages,
    ordersHref,
    homeHref,
    onRetry,
}: ConfirmationSidebarSummaryProps) {
    const headingId = useId();
    const errorAlertId = useId();

    const totalUnits = useMemo(
        () => order.items.reduce((sum, item) => sum + item.quantity, 0),
        [order.items],
    );

    const displayedTotals = useMemo(() => {
        if (isRetryEligible && selectedRetryTerm !== null) {
            return {
                ...order.totals,
                surchargeCents: selectedRetryTerm.surchargeCents,
                totalCents: selectedRetryTerm.totalCents,
            };
        }

        return order.totals;
    }, [isRetryEligible, order.totals, selectedRetryTerm]);

    const displayedTermLabel =
        isRetryEligible && selectedRetryTerm !== null
            ? selectedRetryTerm.label
            : order.paymentTerm.label;

    const canSubmitRetry =
        isRetryEligible &&
        hasAvailableRetryTerms &&
        selectedRetryTerm !== null &&
        selectedRetryTerm.available &&
        !isRetrying;

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
                    {formatInteger(order.items.length)}{' '}
                    {order.items.length === 1 ? 'item' : 'itens'} (
                    {formatInteger(totalUnits)}{' '}
                    {totalUnits === 1 ? 'un.' : 'un.'})
                </span>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3.5 py-2.5 text-sm">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <CreditCard
                        className="size-4 shrink-0"
                        aria-hidden="true"
                    />
                    <span>
                        {isRetryEligible && selectedRetryTerm !== null
                            ? 'Nova condição'
                            : 'Condição de pagamento'}
                    </span>
                </span>
                <span className="font-semibold text-foreground">
                    {displayedTermLabel}
                </span>
            </div>

            <div className="border-t border-b border-border py-3">
                <OrderItemsSummary
                    items={order.items}
                    totalUnits={totalUnits}
                    collapsibleOnMobile
                    defaultMobileOpen={false}
                />
            </div>

            <OrderTotalsBreakdown
                totals={displayedTotals}
                paymentTermLabel={displayedTermLabel}
                totalUnits={totalUnits}
                surchargePercent={selectedRetryTerm?.surchargePercent ?? null}
            />

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

            <div className="flex flex-col gap-2.5 border-t border-border pt-4">
                {isRetryEligible ? (
                    <>
                        <StoreButton
                            type="button"
                            variant="brand"
                            size="lg"
                            disabled={!canSubmitRetry}
                            loading={isRetrying}
                            loadingText="Reenviando pagamento..."
                            onClick={onRetry}
                            aria-describedby={
                                errorMessages.length > 0
                                    ? errorAlertId
                                    : undefined
                            }
                            className="w-full font-semibold"
                        >
                            <RefreshCw
                                className="size-4 shrink-0"
                                aria-hidden="true"
                            />
                            <span>Tentar pagamento novamente</span>
                        </StoreButton>

                        <StoreButton
                            variant="outline"
                            size="touch"
                            asChild
                            className="w-full font-semibold"
                        >
                            <Link href={ordersHref}>
                                <PackageCheck
                                    className="size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <span>Ver meus pedidos</span>
                            </Link>
                        </StoreButton>

                        <StoreButton
                            variant="ghost"
                            size="touch"
                            asChild
                            className="w-full text-muted-foreground hover:text-foreground"
                        >
                            <Link href={homeHref}>
                                <ShoppingBag
                                    className="size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <span>Continuar comprando</span>
                            </Link>
                        </StoreButton>
                    </>
                ) : (
                    <>
                        <StoreButton
                            variant="brand"
                            size="lg"
                            asChild
                            className="w-full font-semibold"
                        >
                            <Link href={ordersHref}>
                                <PackageCheck
                                    className="size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <span>Ver meus pedidos</span>
                            </Link>
                        </StoreButton>

                        <StoreButton
                            variant="outline"
                            size="touch"
                            asChild
                            className="w-full font-semibold"
                        >
                            <Link href={homeHref}>
                                <ShoppingBag
                                    className="size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <span>Continuar comprando</span>
                            </Link>
                        </StoreButton>
                    </>
                )}
            </div>
        </div>
    );
}

type MobileRetryBottomBarProps = {
    selectedRetryTerm: PaymentTermOption | null;
    fallbackTotalCents: number;
    canSubmitRetry: boolean;
    isRetrying: boolean;
    onRetry: () => void;
};

function MobileRetryBottomBar({
    selectedRetryTerm,
    fallbackTotalCents,
    canSubmitRetry,
    isRetrying,
    onRetry,
}: MobileRetryBottomBarProps) {
    const displayedTotal =
        selectedRetryTerm !== null
            ? selectedRetryTerm.totalCents
            : fallbackTotalCents;

    return (
        <div
            role="region"
            aria-label="Nova tentativa de pagamento"
            className="store-container flex items-center justify-between gap-3"
        >
            <div className="flex min-w-0 flex-col">
                <span className="truncate text-xs text-muted-foreground tabular-nums">
                    {selectedRetryTerm
                        ? `Nova condição: ${selectedRetryTerm.label}`
                        : 'Escolha uma condição'}
                </span>
                <span
                    aria-live="polite"
                    aria-atomic="true"
                    className="text-base font-bold text-foreground tabular-nums"
                >
                    {formatCentsToBRL(displayedTotal)}
                </span>
            </div>

            <StoreButton
                type="button"
                variant="brand"
                size="touch"
                disabled={!canSubmitRetry}
                loading={isRetrying}
                loadingText="Reenviando..."
                onClick={onRetry}
                className="shrink-0 font-semibold"
            >
                <RefreshCw className="size-4 shrink-0" aria-hidden="true" />
                <span>Tentar novamente</span>
            </StoreButton>
        </div>
    );
}

/**
 * Tela de resultado e confirmação do pedido (Onda 7 - item 7.4):
 * - Renderiza `<CheckoutLayout currentStep="confirmation">` diretamente (sem `setLayoutProps`).
 * - Move o foco inicial para o título `h1` e anuncia o resultado em `aria-live="polite"`.
 * - Trata todos os desfechos (`paid`, `refused`, `failed`, `expired`, `processing`, `cancelled`).
 * - Quando `canRetryPayment` for verdadeiro em `refused`/`failed`/`expired`, permite escolher outra
 *   condição de pagamento dentre `order.retryTerms` e enviar `POST routes.retry` com `retryIdempotencyKey`.
 */
export default function OrderConfirmationPage({
    order,
    routes,
    retryIdempotencyKey,
}: OrderConfirmationProps) {
    const page = usePage<{ errors?: Record<string, string | undefined> }>();
    const headingRef = useRef<HTMLHeadingElement>(null);
    const isRetryingRef = useRef(false);

    const isUnfinishedPaymentOutcome =
        order.outcome === 'refused' ||
        order.outcome === 'failed' ||
        order.outcome === 'expired';
    const isRetryEligible =
        isUnfinishedPaymentOutcome &&
        order.canRetryPayment &&
        order.retryTerms.length > 0;

    const [chosenRetryCode, setChosenRetryCode] = useState<string | null>(() =>
        resolveInitialRetryTermCode(order.retryTerms, order.paymentTerm.code),
    );
    const [isRetrying, setIsRetrying] = useState(false);
    const [submitErrors, setSubmitErrors] = useState<
        Record<string, string | undefined>
    >({});

    useEffect(() => {
        headingRef.current?.focus();
    }, []);

    const activeRetryTerm = useMemo(() => {
        if (!isRetryEligible) {
            return null;
        }

        if (chosenRetryCode !== null) {
            const match = order.retryTerms.find(
                (term) => term.code === chosenRetryCode && term.available,
            );
            if (match) {
                return match;
            }
        }

        const fallbackCode = resolveInitialRetryTermCode(
            order.retryTerms,
            order.paymentTerm.code,
        );
        if (fallbackCode === null) {
            return null;
        }

        return (
            order.retryTerms.find(
                (term) => term.code === fallbackCode && term.available,
            ) ?? null
        );
    }, [
        chosenRetryCode,
        isRetryEligible,
        order.paymentTerm.code,
        order.retryTerms,
    ]);

    const hasAvailableRetryTerms = useMemo(
        () => order.retryTerms.some((term) => term.available),
        [order.retryTerms],
    );

    const errorMessages = useMemo(
        () => collectServerErrorMessages(page.props.errors, submitErrors),
        [page.props.errors, submitErrors],
    );

    const outcomeMeta = useMemo(() => getOutcomeMeta(order), [order]);
    const formattedCreatedAt = useMemo(
        () => formatOrderDateTime(order.createdAt),
        [order.createdAt],
    );

    const trackingHref = useMemo(() => {
        const extraRoutes = routes as Record<string, string | undefined>;
        return extraRoutes.processing ?? extraRoutes.self ?? routes.orders;
    }, [routes]);

    const handleSelectRetryTerm = useCallback((code: string) => {
        setSubmitErrors({});
        setChosenRetryCode(code);
    }, []);

    const handleRetryPayment = useCallback(() => {
        if (
            isRetryingRef.current ||
            isRetrying ||
            !isRetryEligible ||
            activeRetryTerm === null ||
            !activeRetryTerm.available
        ) {
            return;
        }

        isRetryingRef.current = true;
        setIsRetrying(true);
        setSubmitErrors({});

        router.post(
            routes.retry,
            {
                payment_term_code: activeRetryTerm.code,
                idempotency_key: retryIdempotencyKey,
            },
            {
                preserveScroll: true,
                onError: (errors) => {
                    setSubmitErrors(errors);
                    const messages = collectServerErrorMessages(errors);
                    const message =
                        messages[0] ??
                        'Não foi possível iniciar a nova tentativa de pagamento. Verifique a condição selecionada.';
                    storeToast.error(message);
                },
                onFinish: () => {
                    isRetryingRef.current = false;
                    setIsRetrying(false);
                },
            },
        );
    }, [
        activeRetryTerm,
        isRetryEligible,
        isRetrying,
        retryIdempotencyKey,
        routes.retry,
    ]);

    const summarySlot = useMemo(
        () => (
            <ConfirmationSidebarSummary
                order={order}
                selectedRetryTerm={activeRetryTerm}
                isRetryEligible={isRetryEligible}
                hasAvailableRetryTerms={hasAvailableRetryTerms}
                isRetrying={isRetrying}
                errorMessages={errorMessages}
                ordersHref={routes.orders}
                homeHref={routes.home}
                onRetry={handleRetryPayment}
            />
        ),
        [
            activeRetryTerm,
            errorMessages,
            handleRetryPayment,
            hasAvailableRetryTerms,
            isRetryEligible,
            isRetrying,
            order,
            routes.home,
            routes.orders,
        ],
    );

    const mobileBottomBar = useMemo(() => {
        if (!isRetryEligible) {
            return undefined;
        }

        const canSubmitRetry =
            hasAvailableRetryTerms &&
            activeRetryTerm !== null &&
            activeRetryTerm.available &&
            !isRetrying;

        return (
            <MobileRetryBottomBar
                selectedRetryTerm={activeRetryTerm}
                fallbackTotalCents={order.totals.totalCents}
                canSubmitRetry={canSubmitRetry}
                isRetrying={isRetrying}
                onRetry={handleRetryPayment}
            />
        );
    }, [
        activeRetryTerm,
        handleRetryPayment,
        hasAvailableRetryTerms,
        isRetryEligible,
        isRetrying,
        order.totals.totalCents,
    ]);

    return (
        <CheckoutLayout
            currentStep="confirmation"
            backHref={routes.orders}
            backLabel="Ver meus pedidos"
            summarySlot={summarySlot}
            mobileBottomBar={mobileBottomBar}
        >
            <Head
                title={`Pedido #${order.number} — ${outcomeMeta.badgeLabel}`}
            />

            <div className="flex flex-col gap-8 lg:gap-10">
                {/* Anúncio acessível imediato do resultado do pedido */}
                <div
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                    className="sr-only"
                >
                    {outcomeMeta.title}. {outcomeMeta.subtitle}
                </div>

                <header
                    className={cn(
                        'flex flex-col gap-4 rounded-lg border bg-card p-5 text-card-foreground sm:p-6',
                        outcomeMeta.headerBorderClassName,
                    )}
                >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <span
                                className={cn(
                                    'inline-flex items-center rounded-sm border px-2.5 py-1 text-xs font-semibold',
                                    outcomeMeta.badgeClassName,
                                )}
                            >
                                {outcomeMeta.badgeLabel}
                            </span>

                            <span className="text-xs font-medium text-muted-foreground tabular-nums sm:text-sm">
                                Pedido{' '}
                                <strong className="font-semibold text-foreground">
                                    #{order.number}
                                </strong>
                            </span>
                        </div>

                        <span className="text-xs text-muted-foreground tabular-nums">
                            Registrado em {formattedCreatedAt}
                        </span>
                    </div>

                    <div className="flex items-start gap-3.5">
                        <div className="mt-0.5 shrink-0">
                            <OutcomeIcon outcome={order.outcome} />
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                            <h1
                                ref={headingRef}
                                tabIndex={-1}
                                className="font-semibold tracking-tight text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {outcomeMeta.title}
                            </h1>
                            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                                {outcomeMeta.subtitle}
                            </p>
                        </div>
                    </div>
                </header>

                {/* Etapas do pedido */}
                {order.steps.length > 0 && (
                    <section
                        aria-label="Etapas do pedido"
                        className="flex flex-col gap-3"
                    >
                        <h2 className="text-fluid-xl font-semibold tracking-tight text-foreground">
                            Status do processamento
                        </h2>
                        <OrderSteps steps={order.steps} />
                    </section>
                )}

                {/* Caso 1: Pedido pago -> Próximos passos operacionais */}
                {order.outcome === 'paid' && (
                    <section
                        aria-label="Próximos passos do pedido"
                        className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 text-card-foreground sm:p-6"
                    >
                        <div className="flex flex-col gap-1">
                            <h2 className="text-fluid-xl font-semibold tracking-tight text-foreground">
                                Próximos passos
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Veja o que acontece agora com o faturamento e a
                                expedição da sua compra.
                            </p>
                        </div>

                        <ol className="flex flex-col divide-y divide-border/70 text-sm">
                            <li className="flex flex-col gap-1 py-3 first:pt-0">
                                <span className="font-semibold text-foreground">
                                    1. Confirmação enviada por e-mail
                                </span>
                                <span className="text-muted-foreground">
                                    Enviamos o comprovante do pedido #
                                    {order.number} e os detalhes da condição{' '}
                                    {order.paymentTerm.label} para o e-mail
                                    cadastrado.
                                </span>
                            </li>
                            <li className="flex flex-col gap-1 py-3">
                                <span className="font-semibold text-foreground">
                                    2. Separação de estoque e faturamento
                                </span>
                                <span className="text-muted-foreground">
                                    Os itens reservados entram em separação no
                                    centro de distribuição para emissão da nota
                                    fiscal eletrônica.
                                </span>
                            </li>
                            <li className="flex flex-col gap-1 py-3 last:pb-0">
                                <span className="font-semibold text-foreground">
                                    3. Expedição e acompanhamento
                                </span>
                                <span className="text-muted-foreground">
                                    Assim que a carga for despachada, o
                                    andamento da entrega poderá ser consultado
                                    na área Meus pedidos.
                                </span>
                            </li>
                        </ol>
                    </section>
                )}

                {/* Caso 2: Pagamento recusado / falhou / expirou com nova tentativa habilitada */}
                {isRetryEligible && (
                    <div className="flex flex-col gap-4">
                        <PaymentTermOptions
                            terms={order.retryTerms}
                            selectedTermCode={activeRetryTerm?.code ?? null}
                            onSelectTerm={handleSelectRetryTerm}
                            disabled={isRetrying}
                            errorMessage={
                                submitErrors.payment_term_code ??
                                page.props.errors?.payment_term_code ??
                                null
                            }
                            heading="Escolher outra condição de pagamento"
                            description="Selecione uma condição disponível abaixo para processar o pagamento deste pedido sem precisar montar um novo carrinho."
                            emptyReturnHref={routes.orders}
                            emptyReturnLabel="Ver meus pedidos"
                            previousTermCode={order.paymentTerm.code}
                        />
                    </div>
                )}

                {/* Caso 3: Pagamento recusado / falhou / expirou SEM nova tentativa disponível */}
                {isUnfinishedPaymentOutcome && !order.canRetryPayment && (
                    <section
                        role="status"
                        className="flex flex-col justify-between gap-4 rounded-lg border border-border bg-card p-5 text-sm text-foreground sm:flex-row sm:items-center sm:p-6"
                    >
                        <div className="flex flex-col gap-1">
                            <h2 className="text-base font-semibold text-foreground">
                                Nova tentativa de pagamento indisponível para
                                este pedido
                            </h2>
                            <p className="text-muted-foreground">
                                Consulte o histórico em Meus pedidos ou volte à
                                loja para iniciar uma nova compra.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <StoreButton
                                variant="brand"
                                size="touch"
                                asChild
                                className="font-semibold"
                            >
                                <Link href={routes.orders}>
                                    <span>Ver meus pedidos</span>
                                </Link>
                            </StoreButton>
                            <StoreButton
                                variant="outline"
                                size="touch"
                                asChild
                                className="font-semibold"
                            >
                                <Link href={routes.home}>
                                    <span>Continuar comprando</span>
                                </Link>
                            </StoreButton>
                        </div>
                    </section>
                )}

                {/* Caso 4: Pedido ainda em processamento (`processing`) */}
                {order.outcome === 'processing' && (
                    <section
                        role="status"
                        className="flex flex-col justify-between gap-4 rounded-lg border border-brand/35 bg-brand-muted/25 p-5 text-sm text-foreground sm:flex-row sm:items-center sm:p-6"
                    >
                        <div className="flex flex-col gap-1">
                            <h2 className="text-base font-semibold text-foreground">
                                Pagamento ainda em análise pela operadora
                            </h2>
                            <p className="text-muted-foreground">
                                Acompanhe a atualização automática do pedido #
                                {order.number} ou acesse sua lista de pedidos.
                            </p>
                        </div>

                        <StoreButton
                            variant="brand"
                            size="touch"
                            asChild
                            className="shrink-0 font-semibold"
                        >
                            <Link href={trackingHref}>
                                <span>Voltar ao acompanhamento</span>
                                <ArrowRight
                                    className="size-4 shrink-0"
                                    aria-hidden="true"
                                />
                            </Link>
                        </StoreButton>
                    </section>
                )}

                <OrderAddressSummary address={order.address} />

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground sm:text-sm">
                        Número de referência do pedido:{' '}
                        <strong className="font-semibold text-foreground tabular-nums">
                            #{order.number}
                        </strong>
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                        <StoreButton
                            variant="outline"
                            size="touch"
                            asChild
                            className="font-semibold"
                        >
                            <Link href={routes.orders}>
                                <PackageCheck
                                    className="size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <span>Ver meus pedidos</span>
                            </Link>
                        </StoreButton>

                        <StoreButton
                            variant="ghost"
                            size="touch"
                            asChild
                            className="font-medium"
                        >
                            <Link href={routes.home}>
                                <ShoppingBag
                                    className="size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <span>Continuar comprando</span>
                            </Link>
                        </StoreButton>
                    </div>
                </div>
            </div>
        </CheckoutLayout>
    );
}
