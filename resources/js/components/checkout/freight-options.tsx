import { AlertCircle, MapPin, RefreshCw, Truck } from 'lucide-react';
import { useId } from 'react';
import { StoreButton } from '@/components/button';
import InputError from '@/components/input-error';
import { Skeleton } from '@/components/skeleton';
import { formatCentsToBRL, formatInteger } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { FreightOption } from '@/types/checkout';
import type { FreightOptionsProps } from '@/types/checkout-ui';

export function formatDeliveryEstimate(option: FreightOption): string {
    const min = Math.max(0, option.deliveryDaysMin);
    const max = Math.max(min, option.deliveryDaysMax);

    if (min === max) {
        return `${formatInteger(min)} ${min === 1 ? 'dia útil' : 'dias úteis'}`;
    }

    return `${formatInteger(min)} a ${formatInteger(max)} dias úteis`;
}

/**
 * Seleção de opção de frete (Onda 6 - item 6.2):
 * - Estados: carregando (skeleton durante recálculo), sem endereço selecionado,
 *   erro com botão "Tentar novamente" e lista de opções em grupo de radio acessível.
 * - Exibe "Faltam R$ X para frete grátis" quando `freeShippingMissingCents` estiver presente.
 * - A troca de opção solicita os totais atualizados ao servidor via `onSelectFreight`.
 */
export function FreightOptions({
    freight,
    selectedFreightCode,
    hasSelectedAddress,
    freeShippingMissingCents,
    isLoading,
    errorMessage,
    onSelectFreight,
    onRetry,
}: FreightOptionsProps) {
    const headingId = useId();
    const radioGroupName = useId();
    const errorId = useId();

    const options = freight?.options ?? [];
    const freightError = freight?.error ?? null;

    return (
        <section aria-labelledby={headingId} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <h2
                        id={headingId}
                        className="text-fluid-xl font-semibold tracking-tight text-foreground"
                    >
                        Opções de frete
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Prazo contado em dias úteis após a aprovação do
                        pagamento.
                    </p>
                </div>
            </div>

            {/* Aviso de quanto falta para frete grátis */}
            {freeShippingMissingCents !== null &&
                freeShippingMissingCents > 0 && (
                    <div
                        role="status"
                        aria-live="polite"
                        className="flex items-center gap-2.5 rounded-md border border-brand/25 bg-brand-muted/40 px-3.5 py-2.5 text-sm text-foreground"
                    >
                        <Truck
                            className="size-4 shrink-0 text-brand-muted-foreground"
                            aria-hidden="true"
                        />
                        <span>
                            Faltam{' '}
                            <strong className="font-semibold text-brand-muted-foreground tabular-nums">
                                {formatCentsToBRL(freeShippingMissingCents)}
                            </strong>{' '}
                            para frete grátis na modalidade econômica.
                        </span>
                    </div>
                )}

            {/* Estado 1: Sem endereço cadastrado/selecionado */}
            {!hasSelectedAddress ? (
                <div className="flex items-start gap-3 rounded-lg border border-dashed border-border bg-card/60 p-5 text-sm text-muted-foreground">
                    <MapPin
                        className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                    />
                    <div className="flex flex-col gap-1">
                        <p className="font-medium text-foreground">
                            Aguardando endereço de entrega
                        </p>
                        <p>
                            Cadastre ou selecione o endereço da empresa acima
                            para consultar as modalidades e prazos de entrega.
                        </p>
                    </div>
                </div>
            ) : isLoading ? (
                /* Estado 2: Carregando opções / recalculando frete (Skeleton) */
                <div
                    role="status"
                    aria-live="polite"
                    aria-busy="true"
                    aria-label="Calculando opções de frete"
                    className="grid grid-cols-1 gap-3"
                >
                    <span className="sr-only">
                        Calculando opções de frete para o endereço
                        selecionado...
                    </span>
                    {[0, 1].map((placeholderIndex) => (
                        <div
                            key={placeholderIndex}
                            className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 sm:p-5"
                        >
                            <div className="flex flex-1 items-center gap-3.5">
                                <Skeleton className="size-5 shrink-0 rounded-full" />
                                <div className="flex flex-1 flex-col gap-2">
                                    <Skeleton className="h-4 w-36" />
                                    <Skeleton className="h-3.5 w-28" />
                                </div>
                            </div>
                            <Skeleton className="h-5 w-20 shrink-0" />
                        </div>
                    ))}
                </div>
            ) : freightError !== null ? (
                /* Estado 3: Erro no cálculo de frete com botão "Tentar novamente" */
                <div
                    role="alert"
                    className="flex flex-col justify-between gap-4 rounded-lg border border-destructive/40 bg-destructive/8 p-4 text-sm text-foreground sm:flex-row sm:items-center sm:p-5"
                >
                    <div className="flex items-start gap-3">
                        <AlertCircle
                            className="mt-0.5 size-5 shrink-0 text-destructive"
                            aria-hidden="true"
                        />
                        <div className="flex flex-col gap-1">
                            <p className="font-semibold text-destructive">
                                Falha ao calcular o frete
                            </p>
                            <p className="text-foreground/90">{freightError}</p>
                        </div>
                    </div>

                    <StoreButton
                        type="button"
                        variant="outline"
                        size="touch"
                        onClick={onRetry}
                        className="shrink-0 bg-background font-semibold"
                    >
                        <RefreshCw
                            className="size-4 shrink-0"
                            aria-hidden="true"
                        />
                        <span>Tentar novamente</span>
                    </StoreButton>
                </div>
            ) : options.length === 0 ? (
                /* Caso defensivo: sem opções e sem mensagem de erro explícita */
                <div
                    role="alert"
                    className="flex flex-col justify-between gap-4 rounded-lg border border-border bg-card p-4 text-sm text-foreground sm:flex-row sm:items-center sm:p-5"
                >
                    <p className="text-muted-foreground">
                        Nenhuma modalidade de entrega encontrada para este CEP.
                    </p>
                    <StoreButton
                        type="button"
                        variant="outline"
                        size="touch"
                        onClick={onRetry}
                        className="shrink-0 font-semibold"
                    >
                        <RefreshCw
                            className="size-4 shrink-0"
                            aria-hidden="true"
                        />
                        <span>Tentar novamente</span>
                    </StoreButton>
                </div>
            ) : (
                /* Estado 4: Lista de opções em grupo de radio acessível */
                <div
                    role="radiogroup"
                    aria-labelledby={headingId}
                    aria-describedby={errorMessage ? errorId : undefined}
                    className="grid grid-cols-1 gap-3"
                >
                    {options.map((option) => {
                        const isSelected = option.code === selectedFreightCode;
                        const radioId = `${radioGroupName}-freight-${option.code}`;
                        const isFreeOption =
                            option.isFree || option.priceCents === 0;
                        const estimateText = formatDeliveryEstimate(option);

                        return (
                            <label
                                key={option.code}
                                htmlFor={radioId}
                                className={cn(
                                    'flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-lg border bg-card p-4 text-card-foreground transition-colors duration-150 ease-out sm:p-5',
                                    'has-[input[type=radio]:focus-visible]:ring-2 has-[input[type=radio]:focus-visible]:ring-ring has-[input[type=radio]:focus-visible]:ring-offset-2 has-[input[type=radio]:focus-visible]:ring-offset-background',
                                    isSelected
                                        ? 'border-brand bg-brand-muted/20'
                                        : 'border-border hover:border-foreground/30',
                                )}
                            >
                                <div className="flex min-w-0 items-center gap-3.5">
                                    <input
                                        id={radioId}
                                        type="radio"
                                        name={radioGroupName}
                                        value={option.code}
                                        checked={isSelected}
                                        onChange={() =>
                                            onSelectFreight(option.code)
                                        }
                                        className="sr-only"
                                    />

                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            'flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-150 ease-out',
                                            isSelected
                                                ? 'border-brand bg-brand text-brand-foreground'
                                                : 'border-input bg-background',
                                        )}
                                    >
                                        {isSelected && (
                                            <span className="size-2 rounded-full bg-brand-foreground" />
                                        )}
                                    </span>

                                    <div className="flex min-w-0 flex-col gap-0.5">
                                        <span className="text-base font-semibold text-foreground">
                                            {option.label}
                                        </span>
                                        <span className="text-xs text-muted-foreground sm:text-sm">
                                            Entrega estimada: {estimateText}
                                        </span>
                                    </div>
                                </div>

                                <div className="shrink-0 text-right">
                                    {isFreeOption ? (
                                        <span className="inline-flex items-center rounded-sm border border-success/30 bg-success-muted px-2.5 py-0.5 text-sm font-bold text-success-muted-foreground">
                                            Grátis
                                        </span>
                                    ) : (
                                        <span className="text-base font-bold text-foreground tabular-nums">
                                            {formatCentsToBRL(
                                                option.priceCents,
                                            )}
                                        </span>
                                    )}
                                </div>
                            </label>
                        );
                    })}
                </div>
            )}

            <InputError id={errorId} message={errorMessage ?? undefined} />
        </section>
    );
}

export default FreightOptions;
