import { Head, Link, router } from '@inertiajs/react';
import {
    Clock,
    CreditCard,
    MailCheck,
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
import CheckoutLayout from '@/layouts/checkout-layout';
import { formatInteger } from '@/lib/format';
import type { OrderProcessingProps } from '@/types/order';

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

type ProcessingSidebarSummaryProps = {
    order: OrderProcessingProps['order'];
    ordersHref: string;
    homeHref: string;
};

function ProcessingSidebarSummary({
    order,
    ordersHref,
    homeHref,
}: ProcessingSidebarSummaryProps) {
    const headingId = useId();
    const totalUnits = useMemo(
        () => order.items.reduce((sum, item) => sum + item.quantity, 0),
        [order.items],
    );

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
                    <span>Condição escolhida</span>
                </span>
                <span className="font-semibold text-foreground">
                    {order.paymentTerm.label}
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
                totals={order.totals}
                paymentTermLabel={order.paymentTerm.label}
                totalUnits={totalUnits}
            />

            <div className="flex flex-col gap-2.5 border-t border-border pt-4">
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
            </div>
        </div>
    );
}

/**
 * Tela temporária de acompanhamento de pagamento assíncrono (Onda 7 - item 7.4):
 * - Renderiza `<CheckoutLayout currentStep="processing">` diretamente (sem `setLayoutProps`).
 * - Exibe mensagem clara de que o cliente pode sair da página sem prejudicar o pedido.
 * - Passos do pedido (`received` / `payment` / `confirmed`) com texto + ícone e `aria-live="polite"`.
 * - Polling progressivo com `router.reload({ only: ['order'], preserveScroll: true })` usando `polling.intervalsMs`
 *   (repetindo o último intervalo), pausando quando a aba fica oculta e parando em `order.isPaymentFinal`
 *   ou ao atingir `polling.timeoutMinutes`.
 */
export default function OrderProcessingPage({
    order,
    polling,
    routes,
}: OrderProcessingProps) {
    const [isTimedOut, setIsTimedOut] = useState(false);
    const [isManualRefreshing, setIsManualRefreshing] = useState(false);

    const attemptIndexRef = useRef(0);
    const startedAtRef = useRef<number | null>(null);
    const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inFlightRef = useRef(false);

    const safeIntervals = useMemo(
        () =>
            polling.intervalsMs.length > 0
                ? polling.intervalsMs
                : [2000, 4000, 6000],
        [polling.intervalsMs],
    );

    const timeoutMs = useMemo(
        () => Math.max(1, polling.timeoutMinutes) * 60 * 1000,
        [polling.timeoutMinutes],
    );

    const currentStepLabel = useMemo(() => {
        const active =
            order.steps.find((step) => step.state === 'current') ??
            order.steps.find((step) => step.state === 'failed') ??
            order.steps[order.steps.length - 1];

        return active ? active.label : order.statusLabel;
    }, [order.statusLabel, order.steps]);

    useEffect(() => {
        if (order.isPaymentFinal || isTimedOut) {
            if (pollTimerRef.current !== null) {
                clearTimeout(pollTimerRef.current);
                pollTimerRef.current = null;
            }
            if (timeoutTimerRef.current !== null) {
                clearTimeout(timeoutTimerRef.current);
                timeoutTimerRef.current = null;
            }
            return;
        }

        let isUnmounted = false;

        if (startedAtRef.current === null) {
            startedAtRef.current = Date.now();
        }

        const clearPollTimer = () => {
            if (pollTimerRef.current !== null) {
                clearTimeout(pollTimerRef.current);
                pollTimerRef.current = null;
            }
        };

        const clearTimeoutTimer = () => {
            if (timeoutTimerRef.current !== null) {
                clearTimeout(timeoutTimerRef.current);
                timeoutTimerRef.current = null;
            }
        };

        const hasExceededTimeout = () => {
            if (startedAtRef.current === null) {
                return false;
            }
            return Date.now() - startedAtRef.current >= timeoutMs;
        };

        const scheduleNextPoll = () => {
            clearPollTimer();

            if (isUnmounted) {
                return;
            }

            if (hasExceededTimeout()) {
                setIsTimedOut(true);
                return;
            }

            if (
                typeof document !== 'undefined' &&
                document.visibilityState === 'hidden'
            ) {
                return;
            }

            const idx = Math.min(
                attemptIndexRef.current,
                safeIntervals.length - 1,
            );
            const delay = Math.max(250, safeIntervals[idx] ?? 3000);

            pollTimerRef.current = setTimeout(() => {
                runPoll();
            }, delay);
        };

        const runPoll = () => {
            clearPollTimer();

            if (isUnmounted) {
                return;
            }

            if (hasExceededTimeout()) {
                setIsTimedOut(true);
                return;
            }

            if (
                typeof document !== 'undefined' &&
                document.visibilityState === 'hidden'
            ) {
                return;
            }

            if (inFlightRef.current) {
                scheduleNextPoll();
                return;
            }

            inFlightRef.current = true;
            attemptIndexRef.current += 1;

            router.reload({
                only: ['order'],
                onFinish: () => {
                    inFlightRef.current = false;
                    if (!isUnmounted) {
                        scheduleNextPoll();
                    }
                },
            });
        };

        const elapsed = Date.now() - startedAtRef.current;
        const remainingTimeoutMs = Math.max(0, timeoutMs - elapsed);

        if (remainingTimeoutMs === 0) {
            setIsTimedOut(true);
            return;
        }

        timeoutTimerRef.current = setTimeout(() => {
            clearPollTimer();
            if (!isUnmounted) {
                setIsTimedOut(true);
            }
        }, remainingTimeoutMs);

        const handleVisibilityChange = () => {
            if (isUnmounted) {
                return;
            }

            if (document.visibilityState === 'hidden') {
                clearPollTimer();
                return;
            }

            if (hasExceededTimeout()) {
                clearPollTimer();
                setIsTimedOut(true);
                return;
            }

            runPoll();
        };

        scheduleNextPoll();

        if (typeof document !== 'undefined') {
            document.addEventListener(
                'visibilitychange',
                handleVisibilityChange,
            );
        }

        return () => {
            isUnmounted = true;
            clearPollTimer();
            clearTimeoutTimer();
            if (typeof document !== 'undefined') {
                document.removeEventListener(
                    'visibilitychange',
                    handleVisibilityChange,
                );
            }
        };
    }, [isTimedOut, order.isPaymentFinal, safeIntervals, timeoutMs]);

    const handleManualRefresh = useCallback(() => {
        if (inFlightRef.current || isManualRefreshing) {
            return;
        }

        inFlightRef.current = true;
        setIsManualRefreshing(true);

        router.reload({
            only: ['order'],
            onFinish: () => {
                inFlightRef.current = false;
                setIsManualRefreshing(false);
            },
        });
    }, [isManualRefreshing]);

    const summarySlot = useMemo(
        () => (
            <ProcessingSidebarSummary
                order={order}
                ordersHref={routes.orders}
                homeHref={routes.home}
            />
        ),
        [order, routes.home, routes.orders],
    );

    const formattedCreatedAt = useMemo(
        () => formatOrderDateTime(order.createdAt),
        [order.createdAt],
    );

    return (
        <CheckoutLayout
            currentStep="processing"
            backHref={routes.orders}
            backLabel="Ver meus pedidos"
            summarySlot={summarySlot}
        >
            <Head title={`Processando pedido #${order.number}`} />

            <div className="flex flex-col gap-8 lg:gap-10">
                {/* Região aria-live="polite" para anunciar mudanças de estado aos leitores de tela */}
                <div
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                    className="sr-only"
                >
                    {isTimedOut
                        ? `Pedido ${order.number}: ainda estamos processando seu pagamento. Avisaremos por e-mail quando concluir.`
                        : `Pedido ${order.number}: ${order.statusLabel}. Etapa atual: ${currentStepLabel}.`}
                </div>

                <header className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 text-card-foreground sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <span className="inline-flex items-center gap-1.5 rounded-sm border border-brand/35 bg-brand-muted px-2.5 py-1 text-xs font-semibold text-brand-muted-foreground">
                                <Clock
                                    className="size-3.5 shrink-0"
                                    aria-hidden="true"
                                />
                                <span>{order.statusLabel}</span>
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

                    <div className="flex flex-col gap-2">
                        <h1 className="font-semibold tracking-tight text-foreground">
                            Estamos processando seu pagamento. Você pode sair
                            desta página; o pedido continua.
                        </h1>
                        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                            A reserva dos itens e a validação da condição{' '}
                            <strong className="font-medium text-foreground">
                                {order.paymentTerm.label}
                            </strong>{' '}
                            já foram registradas para o pedido{' '}
                            <strong className="font-medium text-foreground tabular-nums">
                                #{order.number}
                            </strong>
                            . Esta página atualiza o status automaticamente
                            assim que a operadora responder.
                        </p>
                    </div>
                </header>

                <section
                    aria-label="Progresso do pedido"
                    className="flex flex-col gap-3"
                >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-fluid-xl font-semibold tracking-tight text-foreground">
                            Andamento da confirmação
                        </h2>
                        <span className="text-xs text-muted-foreground">
                            {isTimedOut
                                ? 'Processamento em segundo plano'
                                : 'Atualização automática ativa'}
                        </span>
                    </div>

                    <OrderSteps steps={order.steps} />
                </section>

                {/* Orientação de timeout amigável quando o tempo limite estoura */}
                {isTimedOut && (
                    <section
                        role="status"
                        aria-live="polite"
                        className="flex flex-col gap-4 rounded-lg border border-warning/40 bg-warning-muted/60 p-5 text-foreground sm:p-6"
                    >
                        <div className="flex items-start gap-3.5">
                            <MailCheck
                                className="mt-0.5 size-5 shrink-0 text-warning-muted-foreground"
                                aria-hidden="true"
                            />
                            <div className="flex flex-col gap-1.5">
                                <h2 className="text-base font-semibold text-foreground sm:text-lg">
                                    Ainda estamos processando. Avisaremos por
                                    e-mail quando concluir.
                                </h2>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    A confirmação do pagamento está levando um
                                    pouco mais que o habitual, mas o seu pedido{' '}
                                    <strong className="font-semibold text-foreground tabular-nums">
                                        #{order.number}
                                    </strong>{' '}
                                    está salvo e seguro. Você não precisa
                                    aguardar nesta tela: enviaremos o resultado
                                    por e-mail e você pode consultar o status a
                                    qualquer momento em Meus pedidos.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-1">
                            <StoreButton
                                variant="brand"
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
                                variant="outline"
                                size="touch"
                                asChild
                                className="bg-background font-semibold"
                            >
                                <Link href={routes.home}>
                                    <ShoppingBag
                                        className="size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>Continuar comprando</span>
                                </Link>
                            </StoreButton>

                            <StoreButton
                                type="button"
                                variant="ghost"
                                size="touch"
                                loading={isManualRefreshing}
                                loadingText="Consultando..."
                                onClick={handleManualRefresh}
                                className="font-medium text-muted-foreground hover:text-foreground"
                            >
                                <RefreshCw
                                    className="size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <span>Consultar status agora</span>
                            </StoreButton>
                        </div>
                    </section>
                )}

                <OrderAddressSummary address={order.address} />

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground sm:text-sm">
                        Precisa acompanhar depois? Acesse o histórico completo
                        de compras da sua empresa.
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
                                <span>Ir para a loja</span>
                            </Link>
                        </StoreButton>
                    </div>
                </div>
            </div>
        </CheckoutLayout>
    );
}
