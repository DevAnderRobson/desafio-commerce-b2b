import { Link } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    ChevronDown,
    Package,
} from 'lucide-react';
import { useId, useState } from 'react';
import { StoreButton } from '@/components/button';
import { CouponField } from '@/components/checkout/coupon-field';
import InputError from '@/components/input-error';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { formatCentsToBRL, formatInteger } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CheckoutItemSummary } from '@/types/checkout';
import type { OrderSummaryProps } from '@/types/checkout-ui';

function CompactSummaryItemsList({ items }: { items: CheckoutItemSummary[] }) {
    return (
        <ul className="flex max-h-72 flex-col divide-y divide-border/70 overflow-y-auto pr-1">
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
 * Resumo do pedido da etapa de entrega (Onda 6 - itens 6.3 e 6.4):
 * - Lista compacta de itens (miniatura 40×40px, nome, qtd × preço unitário e total da linha).
 * - No desktop (`lg+`), permanece aberto e fixo ao lado (`sticky` via `CheckoutLayout`).
 * - No mobile (`< lg`), a lista de itens é recolhível via disclosure acessível (`Collapsible`)
 *   enquanto o total permanece sempre visível também na barra fixa inferior (`mobileBottomBar`).
 * - Inclui o campo visual desativado de cupom de desconto ("Em breve").
 * - Totais vindos do servidor: subtotal, economia (se > 0), frete (ou "A calcular"/"Grátis") e total.
 * - CTA único primário "Continuar para pagamento" com motivo claro quando desabilitado.
 */
export function OrderSummary({
    summary,
    selectedFreightOption,
    canContinue,
    cannotContinueReason,
    isRecalculating,
    isConfirming,
    cartHref,
    confirmError,
    onConfirm,
}: OrderSummaryProps) {
    const headingId = useId();
    const cannotContinueReasonId = useId();
    const confirmErrorId = useId();
    const [mobileItemsOpen, setMobileItemsOpen] = useState(false);

    const hasFreightSelected = selectedFreightOption !== null;
    const isFreeShipping =
        hasFreightSelected &&
        (selectedFreightOption.isFree || summary.totals.shippingCents === 0);

    const isCtaDisabled = !canContinue || isRecalculating || isConfirming;

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

            {/* Lista de itens: disclosure recolhível no mobile (< lg) e aberta no desktop (lg+) */}
            <div className="border-t border-b border-border py-3">
                <div className="lg:hidden">
                    <Collapsible
                        open={mobileItemsOpen}
                        onOpenChange={setMobileItemsOpen}
                    >
                        <CollapsibleTrigger asChild>
                            <button
                                type="button"
                                className="flex min-h-11 w-full items-center justify-between gap-2 rounded-sm text-left text-sm font-medium text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            >
                                <span>
                                    {mobileItemsOpen
                                        ? 'Ocultar itens do pedido'
                                        : `Ver itens do pedido (${formatInteger(summary.items.length)})`}
                                </span>
                                <ChevronDown
                                    aria-hidden="true"
                                    className={cn(
                                        'size-4 shrink-0 text-muted-foreground transition-transform duration-150 ease-out',
                                        mobileItemsOpen && 'rotate-180',
                                    )}
                                />
                            </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-3">
                            <CompactSummaryItemsList items={summary.items} />
                        </CollapsibleContent>
                    </Collapsible>
                </div>

                <div className="hidden lg:block">
                    <CompactSummaryItemsList items={summary.items} />
                </div>
            </div>

            {/* Campo de cupom de desconto (6.3 — somente visual, desativado) */}
            <CouponField />

            {/* Totais financeiros (sempre vindos do servidor) */}
            <dl
                aria-busy={isRecalculating || undefined}
                className="flex flex-col gap-3 border-t border-border pt-4 text-sm tabular-nums"
            >
                <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">
                        Subtotal ({formatInteger(summary.count)}{' '}
                        {summary.count === 1 ? 'unidade' : 'unidades'})
                    </dt>
                    <dd className="font-medium text-foreground">
                        {formatCentsToBRL(summary.totals.subtotalCents)}
                    </dd>
                </div>

                {summary.totals.savingsCents > 0 && (
                    <div className="flex items-center justify-between gap-4">
                        <dt className="text-muted-foreground">
                            Economia (atacado / promoção)
                        </dt>
                        <dd className="font-semibold text-success-muted-foreground">
                            - {formatCentsToBRL(summary.totals.savingsCents)}
                        </dd>
                    </div>
                )}

                <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">
                        Frete
                        {selectedFreightOption
                            ? ` (${selectedFreightOption.label})`
                            : ''}
                    </dt>
                    <dd
                        className={cn(
                            'font-medium',
                            isFreeShipping
                                ? 'font-semibold text-success-muted-foreground'
                                : hasFreightSelected
                                  ? 'text-foreground'
                                  : 'text-muted-foreground',
                        )}
                    >
                        {isRecalculating
                            ? 'Calculando...'
                            : !hasFreightSelected
                              ? 'A calcular'
                              : isFreeShipping
                                ? 'Grátis'
                                : formatCentsToBRL(
                                      summary.totals.shippingCents,
                                  )}
                    </dd>
                </div>

                {summary.totals.surchargeCents > 0 && (
                    <div className="flex items-center justify-between gap-4">
                        <dt className="text-muted-foreground">
                            Acréscimo financeiro
                        </dt>
                        <dd className="font-medium text-foreground">
                            {formatCentsToBRL(summary.totals.surchargeCents)}
                        </dd>
                    </div>
                )}

                <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
                    <dt className="text-base font-semibold text-foreground">
                        Total do pedido
                    </dt>
                    <dd
                        aria-live="polite"
                        aria-atomic="true"
                        className="text-fluid-2xl font-bold tracking-tight text-foreground"
                    >
                        {formatCentsToBRL(summary.totals.totalCents)}
                    </dd>
                </div>
            </dl>

            <InputError
                id={confirmErrorId}
                message={confirmError ?? undefined}
            />

            {/* CTA único primário + link secundário "Voltar ao carrinho" */}
            <div className="flex flex-col gap-3 pt-1">
                <StoreButton
                    type="button"
                    variant="brand"
                    size="lg"
                    disabled={isCtaDisabled}
                    loading={isConfirming}
                    loadingText="Confirmando entrega..."
                    onClick={onConfirm}
                    aria-describedby={
                        !canContinue
                            ? cannotContinueReasonId
                            : confirmError
                              ? confirmErrorId
                              : undefined
                    }
                    className="w-full font-semibold"
                >
                    <span>Continuar para pagamento</span>
                    <ArrowRight
                        className="size-4 shrink-0"
                        aria-hidden="true"
                    />
                </StoreButton>

                {!canContinue && (
                    <p
                        id={cannotContinueReasonId}
                        role="status"
                        aria-live="polite"
                        className="flex items-start gap-1.5 text-xs font-medium text-muted-foreground"
                    >
                        <AlertCircle
                            className="mt-0.5 size-3.5 shrink-0 text-foreground/80"
                            aria-hidden="true"
                        />
                        <span>{cannotContinueReason}</span>
                    </p>
                )}

                <div className="flex items-center justify-center pt-1">
                    <Link
                        href={cartHref}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-sm px-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                        <ArrowLeft
                            className="size-4 shrink-0"
                            aria-hidden="true"
                        />
                        <span>Voltar ao carrinho</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default OrderSummary;
