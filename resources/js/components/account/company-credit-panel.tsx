import { AlertTriangle, CheckCircle2, CreditCard } from 'lucide-react';
import { useId } from 'react';
import { formatCentsToBRL, formatInteger } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CompanyCreditPanelProps } from '@/types/account-ui';

/**
 * Painel de limite de crédito corporativo (exibido apenas quando `credit !== null`).
 * - Destaca o saldo DISPONÍVEL como informação principal.
 * - Exibe limite total e valor utilizado em `tabular-nums`.
 * - Barra de uso com `role="progressbar"` acompanhada de texto explícito equivalente (nunca só cor).
 * - Superfície única sem aninhamento de card dentro de card.
 */
export function CompanyCreditPanel({ credit }: CompanyCreditPanelProps) {
    const headingId = useId();
    const progressLabelId = useId();

    const rawPercent =
        credit.limitCents > 0
            ? Math.round((credit.usedCents / credit.limitCents) * 100)
            : credit.usedCents > 0
              ? 100
              : 0;
    const usedPercent = Math.min(100, Math.max(0, rawPercent));

    const isExhausted =
        credit.availableCents <= 0 ||
        (credit.limitCents > 0 && credit.usedCents >= credit.limitCents);
    const isHighUsage = !isExhausted && usedPercent >= 80;

    const statusSummaryText = isExhausted
        ? 'Limite a prazo integralmente comprometido — utilize condições à vista'
        : isHighUsage
          ? 'Atenção: uso elevado do limite de crédito corporativo'
          : 'Saldo regular para compras faturadas a prazo';

    return (
        <section
            aria-labelledby={headingId}
            className="flex flex-col gap-5 rounded-lg border border-border bg-card p-5 text-card-foreground sm:p-6"
        >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
                <div className="flex items-center gap-2.5">
                    <CreditCard
                        className="size-5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                    />
                    <h2
                        id={headingId}
                        className="text-fluid-lg font-semibold tracking-tight text-foreground"
                    >
                        Limite de crédito corporativo
                    </h2>
                </div>

                <span
                    className={cn(
                        'inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-semibold',
                        isExhausted
                            ? 'border-destructive/40 bg-destructive/10 text-destructive'
                            : isHighUsage
                              ? 'border-warning/40 bg-warning-muted text-warning-muted-foreground'
                              : 'border-success/35 bg-success-muted text-success-muted-foreground',
                    )}
                >
                    {isExhausted || isHighUsage ? (
                        <AlertTriangle
                            className="size-3.5 shrink-0"
                            aria-hidden="true"
                        />
                    ) : (
                        <CheckCircle2
                            className="size-3.5 shrink-0"
                            aria-hidden="true"
                        />
                    )}
                    <span>{formatInteger(usedPercent)}% utilizado</span>
                </span>
            </div>

            {/* Métricas financeiras sem card dentro de card (divisórias simples) */}
            <dl className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="flex flex-col gap-1 pb-4 sm:pr-6 sm:pb-0">
                    <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Disponível para compras
                    </dt>
                    <dd
                        className={cn(
                            'text-fluid-2xl font-bold tracking-tight tabular-nums',
                            isExhausted
                                ? 'text-destructive'
                                : 'text-foreground',
                        )}
                    >
                        {formatCentsToBRL(credit.availableCents)}
                    </dd>
                </div>

                <div className="flex flex-col gap-1 py-4 sm:px-6 sm:py-0">
                    <dt className="text-xs font-medium text-muted-foreground">
                        Utilizado em aberto
                    </dt>
                    <dd className="text-fluid-lg font-semibold text-foreground tabular-nums">
                        {formatCentsToBRL(credit.usedCents)}
                    </dd>
                </div>

                <div className="flex flex-col gap-1 pt-4 sm:pt-0 sm:pl-6">
                    <dt className="text-xs font-medium text-muted-foreground">
                        Limite total contratado
                    </dt>
                    <dd className="text-fluid-lg font-semibold text-foreground tabular-nums">
                        {formatCentsToBRL(credit.limitCents)}
                    </dd>
                </div>
            </dl>

            {/* Barra de uso + texto equivalente explícito (acessibilidade: nunca apenas cor) */}
            <div className="flex flex-col gap-2 border-t border-border/70 pt-4">
                <div
                    id={progressLabelId}
                    className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm"
                >
                    <span className="font-medium text-foreground">
                        {statusSummaryText}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                        {formatCentsToBRL(credit.usedCents)} em uso de{' '}
                        {formatCentsToBRL(credit.limitCents)} (
                        {formatInteger(usedPercent)}%)
                    </span>
                </div>

                <div
                    role="progressbar"
                    aria-labelledby={progressLabelId}
                    aria-valuenow={usedPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuetext={`${formatInteger(usedPercent)}% do limite utilizado (${formatCentsToBRL(credit.availableCents)} disponível)`}
                    className="h-2.5 w-full overflow-hidden rounded-full bg-secondary"
                >
                    <div
                        className={cn(
                            'h-full rounded-full transition-[width] duration-200 ease-out motion-reduce:transition-none',
                            isExhausted
                                ? 'bg-destructive'
                                : isHighUsage
                                  ? 'bg-warning'
                                  : 'bg-brand',
                        )}
                        style={{ width: `${usedPercent}%` }}
                    />
                </div>
            </div>
        </section>
    );
}
