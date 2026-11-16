import { Link } from '@inertiajs/react';
import {
    Building2,
    ChevronDown,
    MapPin,
    Package,
    Pencil,
    Truck,
} from 'lucide-react';
import { useState } from 'react';
import { StoreButton } from '@/components/button';
import { formatDeliveryEstimate } from '@/components/checkout/freight-options';
import { formatPercentPtBR } from '@/components/checkout/payment-term-options';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { formatCentsToBRL, formatInteger } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CheckoutItemSummary } from '@/types/checkout';
import type {
    OrderAddressSummaryProps,
    OrderItemsSummaryProps,
    OrderTotalsBreakdownProps,
} from '@/types/order-ui';

function ItemsList({
    items,
    maxHeightClassName = 'max-h-72',
}: {
    items: CheckoutItemSummary[];
    maxHeightClassName?: string;
}) {
    return (
        <ul
            className={cn(
                'flex flex-col divide-y divide-border/70 overflow-y-auto pr-1',
                maxHeightClassName,
            )}
        >
            {items.map((item) => (
                <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                    <div className="flex min-w-0 flex-1 items-start gap-2.5">
                        <Link
                            href={item.href}
                            className="relative size-10 shrink-0 overflow-hidden rounded-sm border border-border/70 bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                            {item.imageUrl ? (
                                <img
                                    src={item.imageUrl}
                                    alt={item.imageAlt || item.name}
                                    width={40}
                                    height={40}
                                    loading="lazy"
                                    decoding="async"
                                    className="size-10 object-cover"
                                />
                            ) : (
                                <span className="flex size-full items-center justify-center text-muted-foreground">
                                    <Package
                                        className="size-4 stroke-[1.5]"
                                        aria-hidden="true"
                                    />
                                </span>
                            )}
                        </Link>

                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <Link
                                href={item.href}
                                className="line-clamp-2 rounded-xs text-xs leading-snug font-medium text-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:text-sm"
                            >
                                {item.name}
                            </Link>
                            <span className="text-xs text-muted-foreground tabular-nums">
                                {formatInteger(item.quantity)} ×{' '}
                                {formatCentsToBRL(item.unitPriceCents)}
                            </span>
                        </div>
                    </div>

                    <span className="shrink-0 text-xs font-semibold text-foreground tabular-nums sm:text-sm">
                        {formatCentsToBRL(item.lineTotalCents)}
                    </span>
                </li>
            ))}
        </ul>
    );
}

/**
 * Lista reutilizável de itens do pedido para revisão de pagamento, acompanhamento e confirmação.
 * Suporta modo recolhível no mobile (`collapsibleOnMobile`) ou aberto permanente.
 */
export function OrderItemsSummary({
    items,
    totalUnits,
    collapsibleOnMobile = false,
    defaultMobileOpen = false,
    maxHeightClassName = 'max-h-72',
}: OrderItemsSummaryProps) {
    const [mobileOpen, setMobileOpen] = useState(defaultMobileOpen);
    const unitsCount =
        totalUnits ?? items.reduce((sum, item) => sum + item.quantity, 0);

    if (!collapsibleOnMobile) {
        return (
            <ItemsList items={items} maxHeightClassName={maxHeightClassName} />
        );
    }

    return (
        <div>
            <div className="lg:hidden">
                <Collapsible open={mobileOpen} onOpenChange={setMobileOpen}>
                    <CollapsibleTrigger asChild>
                        <button
                            type="button"
                            className="flex min-h-11 w-full items-center justify-between gap-2 rounded-sm text-left text-sm font-medium text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                            <span>
                                {mobileOpen
                                    ? 'Ocultar itens do pedido'
                                    : `Ver itens do pedido (${formatInteger(items.length)} ${items.length === 1 ? 'item' : 'itens'} · ${formatInteger(unitsCount)} un.)`}
                            </span>
                            <ChevronDown
                                aria-hidden="true"
                                className={cn(
                                    'size-4 shrink-0 text-muted-foreground transition-transform duration-150 ease-out',
                                    mobileOpen && 'rotate-180',
                                )}
                            />
                        </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3">
                        <ItemsList
                            items={items}
                            maxHeightClassName={maxHeightClassName}
                        />
                    </CollapsibleContent>
                </Collapsible>
            </div>

            <div className="hidden lg:block">
                <ItemsList
                    items={items}
                    maxHeightClassName={maxHeightClassName}
                />
            </div>
        </div>
    );
}

/**
 * Resumo de endereço de entrega e frete escolhido (sem card dentro de card).
 * Reutilizado em `checkout/payment`, `orders/processing` e `orders/confirmation`.
 */
export function OrderAddressSummary({
    address,
    freight = null,
    editHref,
    editLabel = 'Alterar',
}: OrderAddressSummaryProps) {
    const hasLabel = Boolean(address.label && address.label.trim() !== '');
    const isFreeFreight =
        freight !== null && (freight.isFree || freight.priceCents === 0);
    const estimateText =
        freight !== null
            ? formatDeliveryEstimate({
                  code: 'selected',
                  ...freight,
              })
            : null;

    return (
        <section
            aria-label="Endereço de entrega e frete"
            className="rounded-lg border border-border bg-card p-4 text-card-foreground sm:p-5"
        >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                <h2 className="text-base font-semibold text-foreground sm:text-lg">
                    Entrega e frete selecionados
                </h2>

                {editHref && (
                    <StoreButton
                        variant="ghost"
                        size="touch"
                        asChild
                        className="h-11 px-3 text-xs font-semibold text-brand-muted-foreground hover:text-foreground sm:text-sm"
                    >
                        <Link href={editHref}>
                            <Pencil
                                className="size-3.5 shrink-0"
                                aria-hidden="true"
                            />
                            <span>{editLabel}</span>
                        </Link>
                    </StoreButton>
                )}
            </div>

            <div
                className={cn(
                    'grid grid-cols-1 gap-4 pt-4',
                    freight !== null &&
                        'sm:grid-cols-2 sm:gap-6 sm:divide-x sm:divide-border',
                )}
            >
                <div className="flex items-start gap-3">
                    {hasLabel ? (
                        <Building2
                            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                        />
                    ) : (
                        <MapPin
                            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                        />
                    )}
                    <div className="flex min-w-0 flex-col gap-0.5 text-sm">
                        <span className="font-semibold text-foreground">
                            {hasLabel
                                ? address.label
                                : 'Endereço de recebimento'}
                        </span>
                        <p className="text-foreground/90">
                            {address.street}, {address.number}
                            {address.complement
                                ? ` — ${address.complement}`
                                : ''}
                        </p>
                        <p className="text-xs text-muted-foreground tabular-nums sm:text-sm">
                            {address.neighborhood} · {address.city}/
                            {address.state} · CEP {address.cep}
                        </p>
                    </div>
                </div>

                {freight !== null && (
                    <div className="flex items-start gap-3 border-t border-border/70 pt-3 sm:border-t-0 sm:pt-0 sm:pl-6">
                        <Truck
                            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
                            <div className="flex items-baseline justify-between gap-2">
                                <span className="font-semibold text-foreground">
                                    {freight.label}
                                </span>
                                <span
                                    className={cn(
                                        'shrink-0 font-bold tabular-nums',
                                        isFreeFreight
                                            ? 'text-success-muted-foreground'
                                            : 'text-foreground',
                                    )}
                                >
                                    {isFreeFreight
                                        ? 'Grátis'
                                        : formatCentsToBRL(freight.priceCents)}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground sm:text-sm">
                                Prazo estimado: {estimateText}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

/**
 * Detalhamento financeiro de totais do pedido (subtotal, economia, frete, acréscimo e total).
 */
export function OrderTotalsBreakdown({
    totals,
    paymentTermLabel = null,
    freightLabel = null,
    isFreeShipping = false,
    totalUnits,
    surchargePercent = null,
}: OrderTotalsBreakdownProps) {
    const freeShipping = isFreeShipping || totals.shippingCents === 0;

    return (
        <dl className="flex flex-col gap-3 text-sm tabular-nums">
            <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">
                    Subtotal
                    {totalUnits !== undefined
                        ? ` (${formatInteger(totalUnits)} ${totalUnits === 1 ? 'unidade' : 'unidades'})`
                        : ''}
                </dt>
                <dd className="font-medium text-foreground">
                    {formatCentsToBRL(totals.subtotalCents)}
                </dd>
            </div>

            {totals.savingsCents > 0 && (
                <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">
                        Economia (atacado / promoção)
                    </dt>
                    <dd className="font-semibold text-success-muted-foreground">
                        - {formatCentsToBRL(totals.savingsCents)}
                    </dd>
                </div>
            )}

            <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">
                    Frete{freightLabel ? ` (${freightLabel})` : ''}
                </dt>
                <dd
                    className={cn(
                        'font-medium',
                        freeShipping
                            ? 'font-semibold text-success-muted-foreground'
                            : 'text-foreground',
                    )}
                >
                    {freeShipping
                        ? 'Grátis'
                        : formatCentsToBRL(totals.shippingCents)}
                </dd>
            </div>

            <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">
                    Acréscimo
                    {paymentTermLabel ? ` (${paymentTermLabel})` : ''}
                    {surchargePercent !== null && surchargePercent > 0
                        ? ` · +${formatPercentPtBR(surchargePercent)}`
                        : ''}
                </dt>
                <dd
                    className={cn(
                        'font-medium',
                        totals.surchargeCents > 0
                            ? 'text-foreground'
                            : 'text-success-muted-foreground',
                    )}
                >
                    {totals.surchargeCents > 0
                        ? `+ ${formatCentsToBRL(totals.surchargeCents)}`
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
                    {formatCentsToBRL(totals.totalCents)}
                </dd>
            </div>
        </dl>
    );
}

export default OrderItemsSummary;
