import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    PackageOpen,
    ShoppingBag,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { OrdersResponsiveList } from '@/components/account/order-status-badge';
import { StoreButton } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { formatInteger } from '@/lib/format';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes/account';
import { index as ordersIndex } from '@/routes/account/orders';
import type { AccountOrdersProps, OrderFilterValue } from '@/types/account';

const EMPTY_STATE_BY_FILTER: Record<
    OrderFilterValue,
    { title: string; description: string }
> = {
    all: {
        title: 'Sua empresa ainda não realizou pedidos',
        description:
            'Quando qualquer comprador vinculado à sua empresa concluir uma compra, o pedido aparecerá aqui com status e itens completos.',
    },
    awaiting_payment: {
        title: 'Nenhum pedido aguardando pagamento',
        description:
            'Não há pedidos com confirmação financeira pendente no momento.',
    },
    in_progress: {
        title: 'Nenhum pedido em andamento',
        description:
            'Não há pedidos em separação ou em transporte neste momento.',
    },
    delivered: {
        title: 'Nenhum pedido entregue encontrado',
        description:
            'Os pedidos concluídos e entregues no endereço da empresa serão listados neste filtro.',
    },
    not_completed: {
        title: 'Nenhum pedido não concluído',
        description:
            'Não há pedidos cancelados, expirados ou com pagamento recusado.',
    },
};

export default function AccountOrdersIndex({
    orders,
    filter,
    filters,
    routes,
}: AccountOrdersProps) {
    const [pendingFilter, setPendingFilter] = useState<OrderFilterValue | null>(
        null,
    );

    const handleSelectFilter = useCallback(
        (status: OrderFilterValue) => {
            if (status === filter && pendingFilter === null) {
                return;
            }

            setPendingFilter(status);
            router.get(
                routes.self,
                { status },
                {
                    preserveState: true,
                    preserveScroll: true,
                    onFinish: () => {
                        setPendingFilter(null);
                    },
                },
            );
        },
        [filter, pendingFilter, routes.self],
    );

    const activeFilterMeta =
        EMPTY_STATE_BY_FILTER[filter] ?? EMPTY_STATE_BY_FILTER.all;
    const hasPagination =
        orders.lastPage > 1 ||
        orders.prevPageUrl !== null ||
        orders.nextPageUrl !== null;

    return (
        <>
            <Head title="Pedidos da empresa" />

            <div className="flex flex-col gap-6">
                {/* Grupo de filtros por status com contagem (acessível por teclado/TV e toque >= 44px) */}
                <section
                    aria-label="Filtrar pedidos por status"
                    className="flex flex-col gap-3"
                >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-sm font-semibold text-foreground">
                            Filtrar por situação
                        </h2>
                        <span
                            role="status"
                            aria-live="polite"
                            className="text-xs text-muted-foreground tabular-nums"
                        >
                            {formatInteger(orders.total)}{' '}
                            {orders.total === 1
                                ? 'pedido encontrado'
                                : 'pedidos encontrados'}
                        </span>
                    </div>

                    <div
                        role="group"
                        aria-label="Situação do pedido"
                        className="flex flex-wrap gap-2"
                    >
                        {filters.map((item) => {
                            const isSelected = filter === item.value;
                            const isLoadingThis = pendingFilter === item.value;

                            return (
                                <button
                                    key={item.value}
                                    type="button"
                                    aria-pressed={isSelected}
                                    disabled={pendingFilter !== null}
                                    onClick={() =>
                                        handleSelectFilter(item.value)
                                    }
                                    className={cn(
                                        'inline-flex min-h-11 items-center gap-2 rounded-md border px-3.5 py-2 text-sm font-medium transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:opacity-60 motion-reduce:transition-none',
                                        isSelected
                                            ? 'border-primary bg-primary font-semibold text-primary-foreground'
                                            : 'border-border bg-card text-foreground hover:border-foreground/30 hover:bg-accent',
                                    )}
                                >
                                    <span>{item.label}</span>
                                    <span
                                        className={cn(
                                            'inline-flex min-w-6 items-center justify-center rounded-sm px-1.5 py-0.5 text-xs font-semibold tabular-nums',
                                            isSelected
                                                ? 'bg-primary-foreground/20 text-primary-foreground'
                                                : 'bg-muted text-muted-foreground',
                                        )}
                                    >
                                        {formatInteger(item.count)}
                                    </span>
                                    {isLoadingThis && (
                                        <span className="sr-only">
                                            Carregando filtro {item.label}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Lista de pedidos ou estado vazio contextualizado pelo filtro */}
                {orders.data.length === 0 ? (
                    filter === 'all' ? (
                        <EmptyState
                            icon={ShoppingBag}
                            title={activeFilterMeta.title}
                            description={activeFilterMeta.description}
                            actionLabel="Explorar catálogo"
                            actionHref={routes.shop}
                        />
                    ) : (
                        <EmptyState
                            icon={PackageOpen}
                            title={activeFilterMeta.title}
                            description={activeFilterMeta.description}
                            actionLabel="Ver todos os pedidos"
                            onAction={() => handleSelectFilter('all')}
                            secondaryAction={
                                <StoreButton
                                    variant="outline"
                                    size="touch"
                                    asChild
                                >
                                    <Link href={routes.shop}>
                                        Ir para a loja
                                    </Link>
                                </StoreButton>
                            }
                        />
                    )
                ) : (
                    <OrdersResponsiveList orders={orders.data} />
                )}

                {/* Paginação por prevPageUrl / nextPageUrl */}
                {hasPagination && (
                    <nav
                        aria-label="Paginação de pedidos"
                        className="flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row"
                    >
                        <p className="text-sm text-muted-foreground tabular-nums">
                            Página{' '}
                            <strong className="font-semibold text-foreground">
                                {formatInteger(orders.currentPage)}
                            </strong>{' '}
                            de{' '}
                            <strong className="font-semibold text-foreground">
                                {formatInteger(orders.lastPage)}
                            </strong>{' '}
                            ({formatInteger(orders.total)}{' '}
                            {orders.total === 1 ? 'pedido' : 'pedidos'})
                        </p>

                        <div className="flex items-center gap-2">
                            {orders.prevPageUrl ? (
                                <StoreButton
                                    variant="outline"
                                    size="touch"
                                    asChild
                                >
                                    <Link
                                        href={orders.prevPageUrl}
                                        preserveScroll
                                    >
                                        <ChevronLeft
                                            className="size-4 shrink-0"
                                            aria-hidden="true"
                                        />
                                        <span>Página anterior</span>
                                    </Link>
                                </StoreButton>
                            ) : (
                                <StoreButton
                                    type="button"
                                    variant="outline"
                                    size="touch"
                                    disabled
                                >
                                    <ChevronLeft
                                        className="size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>Página anterior</span>
                                </StoreButton>
                            )}

                            {orders.nextPageUrl ? (
                                <StoreButton
                                    variant="outline"
                                    size="touch"
                                    asChild
                                >
                                    <Link
                                        href={orders.nextPageUrl}
                                        preserveScroll
                                    >
                                        <span>Próxima página</span>
                                        <ChevronRight
                                            className="size-4 shrink-0"
                                            aria-hidden="true"
                                        />
                                    </Link>
                                </StoreButton>
                            ) : (
                                <StoreButton
                                    type="button"
                                    variant="outline"
                                    size="touch"
                                    disabled
                                >
                                    <span>Próxima página</span>
                                    <ChevronRight
                                        className="size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                </StoreButton>
                            )}
                        </div>
                    </nav>
                )}
            </div>
        </>
    );
}

AccountOrdersIndex.layout = {
    title: 'Pedidos da empresa',
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
