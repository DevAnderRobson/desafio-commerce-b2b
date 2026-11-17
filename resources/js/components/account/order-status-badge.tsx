import { Link } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    ArrowRight,
    Ban,
    CheckCircle2,
    Clock,
    PackageCheck,
    Truck,
} from 'lucide-react';
import { StoreButton } from '@/components/button';
import { formatCentsToBRL, formatInteger } from '@/lib/format';
import { cn } from '@/lib/utils';
import type {
    OrderStatusBadgeProps,
    OrdersResponsiveListProps,
} from '@/types/account-ui';

export function formatAccountDate(isoString: string): string {
    const parsed = new Date(isoString);
    if (Number.isNaN(parsed.getTime())) {
        return isoString;
    }

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(parsed);
}

export function formatAccountDateTime(isoString: string): string {
    const parsed = new Date(isoString);
    if (Number.isNaN(parsed.getTime())) {
        return isoString;
    }

    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(parsed);
}

function StatusIcon({
    status,
    outcome,
}: Pick<OrderStatusBadgeProps, 'status' | 'outcome'>) {
    if (status === 'delivered') {
        return (
            <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
        );
    }

    if (status === 'shipped') {
        return <Truck className="size-3.5 shrink-0" aria-hidden="true" />;
    }

    if (status === 'picking' || status === 'paid') {
        return (
            <PackageCheck className="size-3.5 shrink-0" aria-hidden="true" />
        );
    }

    switch (outcome) {
        case 'processing':
            return <Clock className="size-3.5 shrink-0" aria-hidden="true" />;
        case 'refused':
        case 'failed':
            return (
                <AlertTriangle
                    className="size-3.5 shrink-0"
                    aria-hidden="true"
                />
            );
        case 'expired':
            return (
                <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
            );
        case 'cancelled':
        default:
            return <Ban className="size-3.5 shrink-0" aria-hidden="true" />;
    }
}

function resolveBadgeClasses(
    status: OrderStatusBadgeProps['status'],
    outcome: OrderStatusBadgeProps['outcome'],
): string {
    if (status === 'delivered' || outcome === 'paid') {
        return 'border-success/35 bg-success-muted text-success-muted-foreground';
    }

    if (outcome === 'processing') {
        return 'border-warning/40 bg-warning-muted text-warning-muted-foreground';
    }

    if (outcome === 'refused' || outcome === 'failed') {
        return 'border-destructive/40 bg-destructive/10 text-destructive';
    }

    if (outcome === 'expired') {
        return 'border-warning/40 bg-warning-muted text-warning-muted-foreground';
    }

    return 'border-border bg-muted text-muted-foreground';
}

/**
 * Emblema semântico de status do pedido.
 * Nunca depende apenas de cor: combina ícone representativo e rótulo textual em pt-BR.
 */
export function OrderStatusBadge({
    status,
    statusLabel,
    outcome,
    className,
}: OrderStatusBadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs leading-none font-semibold',
                resolveBadgeClasses(status, outcome),
                className,
            )}
        >
            <StatusIcon status={status} outcome={outcome} />
            <span>{statusLabel}</span>
        </span>
    );
}

/**
 * Lista responsiva de pedidos da empresa:
 * - No desktop (`md+`): tabela semântica sem rolagem horizontal.
 * - No mobile (`< md`): lista empilhada em superfície única com divisórias (`divide-y`), sem card dentro de card.
 */
export function OrdersResponsiveList({
    orders,
    compact = false,
}: OrdersResponsiveListProps) {
    return (
        <div className="rounded-lg border border-border bg-card text-card-foreground">
            {/* Visão mobile e celular pequeno (320px - 767px): lista empilhada sem overflow horizontal */}
            <ul
                aria-label="Lista de pedidos"
                className="divide-y divide-border md:hidden"
            >
                {orders.map((order) => {
                    const formattedDate = formatAccountDate(order.createdAt);
                    const unitsLabel = `${formatInteger(order.unitCount)} ${
                        order.unitCount === 1 ? 'un.' : 'un.'
                    }`;

                    return (
                        <li key={order.number} className="p-4">
                            <div className="flex flex-col gap-3">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-mono text-sm font-semibold text-foreground tabular-nums">
                                            Pedido #{order.number}
                                        </span>
                                        <span className="text-xs text-muted-foreground tabular-nums">
                                            {formattedDate} · {unitsLabel} · Por{' '}
                                            {order.placedBy}
                                        </span>
                                    </div>

                                    <OrderStatusBadge
                                        status={order.status}
                                        statusLabel={order.statusLabel}
                                        outcome={order.outcome}
                                    />
                                </div>

                                <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-2.5">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-muted-foreground">
                                            Total do pedido
                                        </span>
                                        <span className="text-base font-bold text-foreground tabular-nums">
                                            {formatCentsToBRL(order.totalCents)}
                                        </span>
                                    </div>

                                    <StoreButton
                                        variant="outline"
                                        size="touch"
                                        asChild
                                        className="shrink-0 font-semibold"
                                    >
                                        <Link
                                            href={order.href}
                                            aria-label={`Ver detalhes do pedido ${order.number}`}
                                        >
                                            <span>Ver detalhes</span>
                                            <ArrowRight
                                                className="size-4 shrink-0"
                                                aria-hidden="true"
                                            />
                                        </Link>
                                    </StoreButton>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>

            {/* Visão tablet/desktop (md+): tabela semântica limpa sem rolagem horizontal */}
            <div className="hidden md:block">
                <table className="w-full border-collapse text-left text-sm">
                    <thead>
                        <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                            <th scope="col" className="py-3 pr-3 pl-5">
                                Pedido
                            </th>
                            <th scope="col" className="px-3 py-3">
                                Data
                            </th>
                            <th scope="col" className="px-3 py-3">
                                Status
                            </th>
                            {!compact && (
                                <th
                                    scope="col"
                                    className="hidden px-3 py-3 xl:table-cell"
                                >
                                    Comprador
                                </th>
                            )}
                            <th
                                scope="col"
                                className="hidden px-3 py-3 text-right lg:table-cell"
                            >
                                Volumes
                            </th>
                            <th scope="col" className="px-3 py-3 text-right">
                                Total
                            </th>
                            <th
                                scope="col"
                                className="py-3 pr-5 pl-3 text-right"
                            >
                                <span className="sr-only">Ações</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {orders.map((order) => {
                            const formattedDate = formatAccountDate(
                                order.createdAt,
                            );
                            const unitsLabel = `${formatInteger(order.unitCount)} ${
                                order.unitCount === 1 ? 'unidade' : 'unidades'
                            }`;

                            return (
                                <tr
                                    key={order.number}
                                    className="transition-colors duration-150 ease-out hover:bg-muted/30 motion-reduce:transition-none"
                                >
                                    <td className="py-3.5 pr-3 pl-5 align-middle">
                                        <div className="flex flex-col gap-0.5">
                                            <Link
                                                href={order.href}
                                                className="w-fit rounded-xs font-mono font-semibold text-foreground tabular-nums underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                            >
                                                #{order.number}
                                            </Link>
                                            <span className="text-xs text-muted-foreground xl:hidden">
                                                Por {order.placedBy}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3.5 align-middle text-muted-foreground tabular-nums">
                                        {formattedDate}
                                    </td>
                                    <td className="px-3 py-3.5 align-middle">
                                        <OrderStatusBadge
                                            status={order.status}
                                            statusLabel={order.statusLabel}
                                            outcome={order.outcome}
                                        />
                                    </td>
                                    {!compact && (
                                        <td className="hidden px-3 py-3.5 align-middle text-foreground/90 xl:table-cell">
                                            {order.placedBy}
                                        </td>
                                    )}
                                    <td className="hidden px-3 py-3.5 text-right align-middle text-muted-foreground tabular-nums lg:table-cell">
                                        {unitsLabel}
                                    </td>
                                    <td className="px-3 py-3.5 text-right align-middle font-semibold text-foreground tabular-nums">
                                        {formatCentsToBRL(order.totalCents)}
                                    </td>
                                    <td className="py-2.5 pr-5 pl-3 text-right align-middle">
                                        <StoreButton
                                            variant="ghost"
                                            size="touch"
                                            asChild
                                            className="font-semibold text-brand-muted-foreground hover:text-foreground"
                                        >
                                            <Link
                                                href={order.href}
                                                aria-label={`Ver detalhes do pedido ${order.number}`}
                                            >
                                                <span>Ver pedido</span>
                                                <ArrowRight
                                                    className="size-4 shrink-0"
                                                    aria-hidden="true"
                                                />
                                            </Link>
                                        </StoreButton>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
