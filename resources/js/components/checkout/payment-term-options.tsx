import { Link } from '@inertiajs/react';
import { AlertCircle, ArrowLeft, Lock } from 'lucide-react';
import { useId } from 'react';
import { StoreButton } from '@/components/button';
import InputError from '@/components/input-error';
import { formatCentsToBRL } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PaymentTermOption } from '@/types/order';
import type { PaymentTermOptionsProps } from '@/types/order-ui';

const percentFormatter = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
});

export function formatPercentPtBR(percent: number): string {
    return `${percentFormatter.format(percent)}%`;
}

function isCreditLimitBlock(option: PaymentTermOption): boolean {
    if (option.available) {
        return false;
    }

    if (option.availableCreditCents !== null) {
        return true;
    }

    if (!option.isDeferred) {
        return false;
    }

    const reason = (option.unavailableReason ?? '').toLowerCase();

    return (
        reason.includes('limite') ||
        reason.includes('crédito') ||
        reason.includes('credito')
    );
}

/**
 * Grupo de opções de condição de pagamento (Onda 7 - itens 7.1 e 7.4):
 * - Radio group acessível sem aninhamento de card dentro de card.
 * - Exibe nome, descrição, acréscimo (% e valor em R$) e total resultante vindos do servidor.
 * - Opções indisponíveis ficam desabilitadas (`disabled` + `aria-disabled="true"`) com `unavailableReason`
 *   sempre visível em texto, crédito disponível (`availableCreditCents`) e sugestão de PIX quando a prazo bloqueada por limite.
 */
export function PaymentTermOptions({
    terms,
    selectedTermCode,
    onSelectTerm,
    disabled = false,
    errorMessage,
    heading = 'Condição de pagamento',
    description = 'Escolha como sua empresa prefere pagar este pedido. Os valores já incluem eventual acréscimo financeiro da condição.',
    emptyReturnHref,
    emptyReturnLabel = 'Voltar para entrega',
    previousTermCode = null,
}: PaymentTermOptionsProps) {
    const headingId = useId();
    const radioGroupName = useId();
    const errorId = useId();

    const hasAnyAvailable = terms.some((term) => term.available);
    const hasPixAvailable = terms.some(
        (term) =>
            term.available &&
            (term.code.toLowerCase().includes('pix') ||
                term.label.toLowerCase().includes('pix')),
    );

    return (
        <section aria-labelledby={headingId} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
                <h2
                    id={headingId}
                    className="text-fluid-xl font-semibold tracking-tight text-foreground"
                >
                    {heading}
                </h2>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>

            {!hasAnyAvailable && (
                <div
                    role="status"
                    aria-live="polite"
                    className="flex flex-col justify-between gap-4 rounded-lg border border-warning/40 bg-warning-muted/60 p-4 text-sm text-foreground sm:flex-row sm:items-center sm:p-5"
                >
                    <div className="flex items-start gap-3">
                        <AlertCircle
                            className="mt-0.5 size-5 shrink-0 text-warning-muted-foreground"
                            aria-hidden="true"
                        />
                        <div className="flex flex-col gap-1">
                            <p className="font-semibold text-foreground">
                                Nenhuma condição de pagamento disponível para
                                este pedido
                            </p>
                            <p className="text-muted-foreground">
                                Verifique os motivos de indisponibilidade abaixo
                                ou ajuste os itens e a entrega do pedido.
                            </p>
                        </div>
                    </div>

                    {emptyReturnHref && (
                        <StoreButton
                            variant="outline"
                            size="touch"
                            asChild
                            className="shrink-0 bg-background font-semibold"
                        >
                            <Link href={emptyReturnHref}>
                                <ArrowLeft
                                    className="size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <span>{emptyReturnLabel}</span>
                            </Link>
                        </StoreButton>
                    )}
                </div>
            )}

            {terms.length > 0 && (
                <div
                    role="radiogroup"
                    aria-labelledby={headingId}
                    aria-describedby={errorMessage ? errorId : undefined}
                    className="grid grid-cols-1 gap-3"
                >
                    {terms.map((option) => {
                        const isSelected =
                            option.available &&
                            option.code === selectedTermCode;
                        const isOptionDisabled = disabled || !option.available;
                        const radioId = `${radioGroupName}-term-${option.code}`;
                        const reasonId = `${radioGroupName}-reason-${option.code}`;
                        const hasSurcharge =
                            option.surchargeCents > 0 ||
                            option.surchargePercent > 0;
                        const showCreditBlockDetails =
                            isCreditLimitBlock(option);
                        const hasDistinctDescription =
                            Boolean(option.description) &&
                            option.description.trim().toLowerCase() !==
                                option.label.trim().toLowerCase();
                        const isPreviousAttempt =
                            previousTermCode !== null &&
                            previousTermCode === option.code;

                        return (
                            <label
                                key={option.code}
                                htmlFor={radioId}
                                aria-disabled={
                                    !option.available ? 'true' : undefined
                                }
                                className={cn(
                                    'flex min-h-14 flex-col gap-3 rounded-lg border bg-card p-4 text-card-foreground transition-colors duration-150 ease-out sm:p-5',
                                    'has-[input[type=radio]:focus-visible]:ring-2 has-[input[type=radio]:focus-visible]:ring-ring has-[input[type=radio]:focus-visible]:ring-offset-2 has-[input[type=radio]:focus-visible]:ring-offset-background',
                                    !option.available
                                        ? 'cursor-not-allowed border-border/80 bg-muted/35'
                                        : isOptionDisabled
                                          ? 'cursor-not-allowed opacity-75'
                                          : 'cursor-pointer',
                                    isSelected
                                        ? 'border-brand bg-brand-muted/20'
                                        : option.available &&
                                              'border-border hover:border-foreground/30',
                                )}
                            >
                                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start sm:gap-4">
                                    <div className="flex min-w-0 flex-1 items-start gap-3.5">
                                        <input
                                            id={radioId}
                                            type="radio"
                                            name={radioGroupName}
                                            value={option.code}
                                            checked={isSelected}
                                            disabled={isOptionDisabled}
                                            aria-disabled={isOptionDisabled}
                                            aria-describedby={
                                                !option.available
                                                    ? reasonId
                                                    : undefined
                                            }
                                            onChange={() => {
                                                if (!isOptionDisabled) {
                                                    onSelectTerm(option.code);
                                                }
                                            }}
                                            className="sr-only"
                                        />

                                        <span
                                            aria-hidden="true"
                                            className={cn(
                                                'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-150 ease-out',
                                                !option.available
                                                    ? 'border-border bg-muted text-muted-foreground'
                                                    : isSelected
                                                      ? 'border-brand bg-brand text-brand-foreground'
                                                      : 'border-input bg-background',
                                            )}
                                        >
                                            {!option.available ? (
                                                <Lock className="size-3" />
                                            ) : (
                                                isSelected && (
                                                    <span className="size-2 rounded-full bg-brand-foreground" />
                                                )
                                            )}
                                        </span>

                                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                    className={cn(
                                                        'text-base font-semibold',
                                                        option.available
                                                            ? 'text-foreground'
                                                            : 'text-foreground/80',
                                                    )}
                                                >
                                                    {option.label}
                                                </span>

                                                <span className="inline-flex items-center rounded-sm border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                                                    {option.isDeferred
                                                        ? 'Faturamento a prazo'
                                                        : 'À vista'}
                                                </span>

                                                {isPreviousAttempt && (
                                                    <span className="inline-flex items-center rounded-sm border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                                        Tentativa anterior
                                                    </span>
                                                )}

                                                {!option.available && (
                                                    <span className="inline-flex items-center rounded-sm border border-warning/40 bg-warning-muted px-2 py-0.5 text-xs font-semibold text-warning-muted-foreground">
                                                        Indisponível
                                                    </span>
                                                )}
                                            </div>

                                            {hasDistinctDescription && (
                                                <p className="text-sm text-muted-foreground">
                                                    {option.description}
                                                </p>
                                            )}

                                            <p className="text-xs text-muted-foreground tabular-nums sm:text-sm">
                                                {hasSurcharge ? (
                                                    <>
                                                        Acréscimo financeiro:{' '}
                                                        <span className="font-medium text-foreground">
                                                            +
                                                            {formatPercentPtBR(
                                                                option.surchargePercent,
                                                            )}{' '}
                                                            (+
                                                            {formatCentsToBRL(
                                                                option.surchargeCents,
                                                            )}
                                                            )
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="font-medium text-success-muted-foreground">
                                                        Sem acréscimo financeiro
                                                        (0%)
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 flex-row items-baseline justify-between gap-2 border-t border-border/60 pt-2.5 pl-8 sm:flex-col sm:items-end sm:justify-start sm:border-t-0 sm:pt-0 sm:pl-0">
                                        <span className="text-xs text-muted-foreground">
                                            Total nesta condição
                                        </span>
                                        <span
                                            className={cn(
                                                'text-base font-bold tabular-nums sm:text-lg',
                                                option.available
                                                    ? 'text-foreground'
                                                    : 'text-muted-foreground',
                                            )}
                                        >
                                            {formatCentsToBRL(
                                                option.totalCents,
                                            )}
                                        </span>
                                    </div>
                                </div>

                                {!option.available && (
                                    <div
                                        id={reasonId}
                                        className="flex flex-col gap-1.5 border-t border-border/80 pt-3 pl-8 text-xs sm:text-sm"
                                    >
                                        <p className="flex items-start gap-2 font-medium text-foreground">
                                            <AlertCircle
                                                className="mt-0.5 size-4 shrink-0 text-warning-muted-foreground"
                                                aria-hidden="true"
                                            />
                                            <span>
                                                {option.unavailableReason ||
                                                    'Esta condição de pagamento não está disponível para o pedido atual.'}
                                            </span>
                                        </p>

                                        {option.availableCreditCents !==
                                            null && (
                                            <p className="pl-6 font-medium text-foreground tabular-nums">
                                                Crédito disponível:{' '}
                                                <strong className="font-semibold">
                                                    {formatCentsToBRL(
                                                        option.availableCreditCents,
                                                    )}
                                                </strong>
                                            </p>
                                        )}

                                        {showCreditBlockDetails && (
                                            <p className="pl-6 text-muted-foreground">
                                                {hasPixAvailable
                                                    ? 'Sugestão: selecione o pagamento via PIX para concluir este pedido à vista sem depender do limite de crédito.'
                                                    : 'Sugestão: utilize o pagamento via PIX para concluir pedidos acima do limite de crédito disponível.'}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </label>
                        );
                    })}
                </div>
            )}

            <InputError id={errorId} message={errorMessage ?? undefined} />
        </section>
    );
}

export default PaymentTermOptions;
