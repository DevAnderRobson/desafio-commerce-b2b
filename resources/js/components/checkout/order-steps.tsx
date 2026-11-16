import { AlertTriangle, Check, Clock, Circle } from 'lucide-react';
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
 * Passos do processamento do pedido (`received` / `payment` / `confirmed`).
 * Sempre comunica o estado com texto explícito + ícone (nunca apenas cor) e sem spinner infinito sem contexto.
 */
export function OrderSteps({
    steps,
    ariaLabel = 'Etapas de processamento do pedido',
}: OrderStepsProps) {
    if (steps.length === 0) {
        return null;
    }

    return (
        <nav aria-label={ariaLabel}>
            <ol className="grid grid-cols-1 divide-y divide-border rounded-lg border border-border bg-card text-card-foreground sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {steps.map((step, index) => {
                    const meta = STEP_STATE_META[step.state];
                    const isCurrent = step.state === 'current';

                    return (
                        <li
                            key={step.key}
                            aria-current={isCurrent ? 'step' : undefined}
                            className={cn(
                                'flex items-start gap-3.5 p-4 sm:p-5',
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
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-xs font-medium text-muted-foreground tabular-nums">
                                        Passo {index + 1} de {steps.length}
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
                                        'text-sm font-semibold sm:text-base',
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
