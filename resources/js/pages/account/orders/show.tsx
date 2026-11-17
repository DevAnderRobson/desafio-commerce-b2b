import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Calendar,
    CreditCard,
    ExternalLink,
    RotateCcw,
    User as UserIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    formatAccountDateTime,
    OrderStatusBadge,
} from '@/components/account/order-status-badge';
import { ShipmentTracking } from '@/components/account/shipment-tracking';
import { StoreButton } from '@/components/button';
import {
    OrderAddressSummary,
    OrderItemsSummary,
    OrderTotalsBreakdown,
} from '@/components/checkout/order-items-summary';
import { OrderSteps } from '@/components/checkout/order-steps';
import { storeToast } from '@/components/toast';
import { useOrderLiveUpdates } from '@/hooks/use-order-live-updates';
import { formatInteger } from '@/lib/format';
import { dashboard } from '@/routes/account';
import { index as ordersIndex } from '@/routes/account/orders';
import type { AccountOrderShowProps } from '@/types/account';

const LIVE_RELOAD_COALESCE_MS = 400;

export default function AccountOrderShow({
    order,
    routes,
}: AccountOrderShowProps) {
    const [isRepeating, setIsRepeating] = useState(false);
    const inFlightReloadRef = useRef(false);
    const liveReloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );
    const lastReloadAtRef = useRef(0);
    const unmountedRef = useRef(false);

    const handleLiveOrderUpdate = useCallback(() => {
        if (unmountedRef.current || inFlightReloadRef.current) {
            return;
        }

        if (liveReloadTimerRef.current !== null) {
            return;
        }

        const elapsedSinceLastReload = Date.now() - lastReloadAtRef.current;
        const delay = Math.max(
            LIVE_RELOAD_COALESCE_MS,
            LIVE_RELOAD_COALESCE_MS - elapsedSinceLastReload,
        );

        liveReloadTimerRef.current = setTimeout(() => {
            liveReloadTimerRef.current = null;

            if (unmountedRef.current || inFlightReloadRef.current) {
                return;
            }

            inFlightReloadRef.current = true;
            lastReloadAtRef.current = Date.now();

            router.reload({
                only: ['order'],
                onFinish: () => {
                    inFlightReloadRef.current = false;
                },
            });
        }, delay);
    }, []);

    useOrderLiveUpdates(order.number, handleLiveOrderUpdate);

    useEffect(() => {
        unmountedRef.current = false;

        return () => {
            unmountedRef.current = true;
            if (liveReloadTimerRef.current !== null) {
                clearTimeout(liveReloadTimerRef.current);
                liveReloadTimerRef.current = null;
            }
        };
    }, []);

    const formattedCreatedAt = useMemo(
        () => formatAccountDateTime(order.createdAt),
        [order.createdAt],
    );

    const totalUnits = useMemo(
        () => order.items.reduce((sum, item) => sum + item.quantity, 0),
        [order.items],
    );

    const showPaymentLink =
        order.canRetryPayment ||
        order.status === 'pending_payment' ||
        order.outcome === 'processing' ||
        !order.isPaymentFinal;

    const handleRepeatOrder = useCallback(() => {
        if (isRepeating) {
            return;
        }

        setIsRepeating(true);
        router.post(
            routes.repeat,
            {},
            {
                onError: () => {
                    storeToast.error(
                        'Não foi possível repetir o pedido no momento. Tente novamente.',
                    );
                },
                onFinish: () => {
                    setIsRepeating(false);
                },
            },
        );
    }, [isRepeating, routes.repeat]);

    return (
        <>
            <Head title={`Pedido #${order.number}`} />

            <div className="flex flex-col gap-6">
                {/* Navegação de retorno para a listagem */}
                <div>
                    <StoreButton
                        variant="ghost"
                        size="touch"
                        asChild
                        className="-ml-3 font-medium text-muted-foreground hover:text-foreground"
                    >
                        <Link href={routes.list}>
                            <ArrowLeft
                                className="size-4 shrink-0"
                                aria-hidden="true"
                            />
                            <span>Voltar aos pedidos</span>
                        </Link>
                    </StoreButton>
                </div>

                {/* Cabeçalho do pedido: número, status, metadados e ações principais */}
                <section
                    aria-labelledby="order-detail-heading"
                    className="flex flex-col justify-between gap-4 rounded-lg border border-border bg-card p-5 text-card-foreground sm:p-6 lg:flex-row lg:items-center"
                >
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <h2
                                id="order-detail-heading"
                                className="font-mono text-fluid-xl font-bold tracking-tight text-foreground tabular-nums"
                            >
                                Pedido #{order.number}
                            </h2>
                            <OrderStatusBadge
                                status={order.status}
                                statusLabel={order.statusLabel}
                                outcome={order.outcome}
                            />
                        </div>

                        <dl className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                            <div className="inline-flex items-center gap-1.5">
                                <Calendar
                                    className="size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <dt className="sr-only">Data do pedido:</dt>
                                <dd className="tabular-nums">
                                    Realizado em {formattedCreatedAt}
                                </dd>
                            </div>

                            <div className="inline-flex items-center gap-1.5">
                                <UserIcon
                                    className="size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <dt>Comprador:</dt>
                                <dd className="font-medium text-foreground">
                                    {order.placedBy}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 border-t border-border/70 pt-3 lg:border-t-0 lg:pt-0">
                        {showPaymentLink && (
                            <StoreButton
                                variant="outline"
                                size="touch"
                                asChild
                                className="w-full font-semibold sm:w-auto"
                            >
                                <Link href={routes.payment}>
                                    <ExternalLink
                                        className="size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>Ver pagamento</span>
                                </Link>
                            </StoreButton>
                        )}

                        <StoreButton
                            type="button"
                            variant="default"
                            size="touch"
                            loading={isRepeating}
                            loadingText="Repetindo pedido..."
                            onClick={handleRepeatOrder}
                            className="w-full font-semibold sm:w-auto"
                        >
                            <RotateCcw
                                className="size-4 shrink-0"
                                aria-hidden="true"
                            />
                            <span>Repetir pedido</span>
                        </StoreButton>
                    </div>
                </section>

                {/* Linha do tempo completa de etapas do pedido */}
                <OrderSteps
                    steps={order.steps}
                    ariaLabel={`Etapas de acompanhamento do pedido ${order.number}`}
                />

                {/* Corpo principal: rastreamento + itens + endereço snapshot + condição de pagamento e totais */}
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:items-start">
                    <div className="flex flex-col gap-6 xl:col-span-7">
                        {/* Entrega e rastreamento (acima dos itens) */}
                        <ShipmentTracking
                            key={order.number}
                            shipment={order.shipment}
                            status={order.status}
                            heading="Entrega e rastreamento"
                        />

                        {/* Itens do pedido */}
                        <section
                            aria-labelledby="order-items-heading"
                            className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 text-card-foreground sm:p-6"
                        >
                            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
                                <h2
                                    id="order-items-heading"
                                    className="text-base font-semibold text-foreground sm:text-lg"
                                >
                                    Itens do pedido
                                </h2>
                                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                                    {formatInteger(order.items.length)}{' '}
                                    {order.items.length === 1
                                        ? 'item'
                                        : 'itens'}{' '}
                                    · {formatInteger(totalUnits)}{' '}
                                    {totalUnits === 1 ? 'unidade' : 'unidades'}
                                </span>
                            </div>

                            <OrderItemsSummary
                                items={order.items}
                                totalUnits={totalUnits}
                                maxHeightClassName="max-h-none"
                            />
                        </section>

                        {/* Endereço de entrega (snapshot gravado no pedido) */}
                        <OrderAddressSummary address={order.address} />
                    </div>

                    {/* Resumo financeiro, condição de pagamento e comprador */}
                    <section
                        aria-labelledby="order-financial-heading"
                        className="flex flex-col gap-5 rounded-lg border border-border bg-card p-5 text-card-foreground sm:p-6 xl:col-span-5"
                    >
                        <h2
                            id="order-financial-heading"
                            className="border-b border-border pb-3 text-base font-semibold text-foreground sm:text-lg"
                        >
                            Pagamento e totais
                        </h2>

                        <dl className="flex flex-col gap-2.5 border-b border-border pb-4 text-sm">
                            <div className="flex items-center justify-between gap-3">
                                <dt className="inline-flex items-center gap-2 text-muted-foreground">
                                    <CreditCard
                                        className="size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>Condição de pagamento</span>
                                </dt>
                                <dd className="font-semibold text-foreground">
                                    {order.paymentTerm.label}
                                </dd>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <dt className="inline-flex items-center gap-2 text-muted-foreground">
                                    <UserIcon
                                        className="size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>Pedido realizado por</span>
                                </dt>
                                <dd className="font-medium text-foreground">
                                    {order.placedBy}
                                </dd>
                            </div>
                        </dl>

                        <OrderTotalsBreakdown
                            totals={order.totals}
                            paymentTermLabel={order.paymentTerm.label}
                            totalUnits={totalUnits}
                        />
                    </section>
                </div>
            </div>
        </>
    );
}

AccountOrderShow.layout = {
    title: 'Detalhes do pedido',
    breadcrumbs: [
        {
            title: 'Resumo da conta',
            href: dashboard(),
        },
        {
            title: 'Pedidos da empresa',
            href: ordersIndex(),
        },
    ],
};
