import { AlertTriangle, Check, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrderStepState } from '@/types/order';
import type { OrderStepsProps } from '@/types/order-ui';

const STEP_STATE_META: Record<
    OrderStepState,
    {
        statusText: string;
        badgeClassName: string;
        iconWrapperClassName: string;
    }
> = {
    done: {
        statusText: 'Concluído',
        badgeClassName:
            'border-success/35 bg-success-muted text-success-muted-foreground',
        iconWrapperClassName:
            'border-success bg-success text-success-foreground',
    },
    current: {
        statusText: 'Em andamento',
        badgeClassName:
            'border-brand/35 bg-brand-muted text-brand-muted-foreground',
        iconWrapperClassName: 'border-brand bg-brand text-brand-foreground',
    },
    pending: {
        statusText: 'Aguardando',
        badgeClassName: 'border-border bg-muted text-muted-foreground',
        iconWrapperClassName: 'border-border bg-muted text-muted-foreground',
    },
    failed: {
        statusText: 'Não concluído',
        badgeClassName:
            'border-destructive/40 bg-destructive/10 text-destructive',
        iconWrapperClassName:
            'border-destructive bg-destructive text-destructive-foreground',
    },
};

function StepIcon({ state }: { state: OrderStepState }) {
    switch (state) {
        case 'done':
            return <Check className="size-4 stroke-[2.5]" aria-hidden="true" />;
        case 'current':
            return <Clock className="size-4 stroke-[2.2]" aria-hidden="true" />;
        case 'failed':
            return (
                <AlertTriangle
                    className="size-4 stroke-[2.2]"
                    aria-hidden="true"
                />
            );
        case 'pending':
        default:
            return <Circle className="size-3.5" aria-hidden="true" />;
    }
}

/**
 * Linha do tempo de etapas do pedido (`received` → `payment` → `confirmed` → `picking` → `shipped` → `delivered`).
 * - Rótulos vêm sempre do servidor (`step.label`).
 * - Comunica cada estado com texto explícito + ícone (nunca apenas cor).
 * - Mobile-first (vertical em 320px+, grade compacta horizontal somente onde couber sem quebrar).
 * - Aceita `maxSteps` para exibir apenas os 3 primeiros passos enquanto o pagamento não é final.
 */
export function OrderSteps({
    steps,
    ariaLabel = 'Etapas de acompanhamento do pedido',
    maxSteps,
}: OrderStepsProps) {
    const visibleSteps =
        typeof maxSteps === 'number' && maxSteps > 0
            ? steps.slice(0, maxSteps)
            : steps;

    if (visibleSteps.length === 0) {
        return null;
    }

    const isCompactThreeSteps = visibleSteps.length <= 3;

    return (
        <nav aria-label={ariaLabel}>
            <ol
                className={cn(
                    'grid grid-cols-1 overflow-hidden rounded-lg border border-border bg-card text-card-foreground',
                    isCompactThreeSteps
                        ? 'sm:grid-cols-3'
                        : 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3',
                )}
            >
                {visibleSteps.map((step, index) => {
                    const meta = STEP_STATE_META[step.state];
                    const isCurrent = step.state === 'current';

                    return (
                        <li
                            key={step.key}
                            aria-current={isCurrent ? 'step' : undefined}
                            className={cn(
                                'flex items-start gap-3 p-3.5 outline-1 outline-border sm:gap-3.5 sm:p-4 lg:p-5',
                                isCurrent && 'bg-brand-muted/15',
                                step.state === 'failed' && 'bg-destructive/5',
                            )}
                        >
                            <span
                                aria-hidden="true"
                                className={cn(
                                    'mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full border',
                                    meta.iconWrapperClassName,
                                )}
                            >
                                <StepIcon state={step.state} />
                            </span>

                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                    <span className="text-xs font-medium text-muted-foreground tabular-nums">
                                        Passo {index + 1} de{' '}
                                        {visibleSteps.length}
                                    </span>
                                    <span
                                        className={cn(
                                            'inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-semibold',
                                            meta.badgeClassName,
                                        )}
                                    >
                                        {meta.statusText}
                                    </span>
                                </div>

                                <span
                                    className={cn(
                                        'text-sm leading-snug font-semibold wrap-break-word sm:text-base',
                                        step.state === 'pending'
                                            ? 'text-muted-foreground'
                                            : 'text-foreground',
                                    )}
                                >
                                    {step.label}
                                </span>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

export default OrderSteps;
