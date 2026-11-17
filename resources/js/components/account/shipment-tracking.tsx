import {
    Check,
    CheckCircle2,
    Clock,
    Copy,
    MapPin,
    PackageCheck,
    Truck,
} from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { StoreButton } from '@/components/button';
import { cn } from '@/lib/utils';
import type { ShipmentTrackingProps } from '@/types/account-ui';
import type { ShipmentEvent } from '@/types/order';

const COPY_FEEDBACK_DURATION_MS = 2500;

export function formatShipmentEventDateTime(isoString: string): string {
    const parsed = new Date(isoString);
    if (Number.isNaN(parsed.getTime())) {
        return isoString;
    }

    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(parsed);
}

function EventCodeIcon({
    code,
    isLatest,
}: {
    code: ShipmentEvent['code'];
    isLatest: boolean;
}) {
    if (code === 'delivered') {
        return <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />;
    }

    if (!isLatest) {
        return (
            <Check
                className="size-3.5 shrink-0 stroke-[2.5]"
                aria-hidden="true"
            />
        );
    }

    switch (code) {
        case 'out_for_delivery':
        case 'in_transit':
            return <Truck className="size-4 shrink-0" aria-hidden="true" />;
        case 'at_hub':
            return <MapPin className="size-4 shrink-0" aria-hidden="true" />;
        case 'posted':
        default:
            return (
                <PackageCheck className="size-4 shrink-0" aria-hidden="true" />
            );
    }
}

/**
 * Seção de entrega e rastreamento do pedido:
 * - Cabeçalho com transportadora e código de rastreio copiável (com confirmação acessível).
 * - Linha do tempo dos eventos com o mais recente no topo, destacando o evento atual e
 *   marcando explicitamente "Entregue" quando o último evento `delivered` chega.
 * - Estado vazio orientado enquanto `shipment` for `null`.
 * - Região `aria-live="polite"` anunciando novos eventos somente após o primeiro render.
 */
export function ShipmentTracking({
    shipment,
    status,
    heading = 'Entrega e rastreamento',
    className,
}: ShipmentTrackingProps) {
    const headingId = useId();
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const latestEvent = shipment?.events[0] ?? null;
    const currentEventSignature =
        latestEvent !== null
            ? `${shipment?.events.length ?? 0}:${latestEvent.id}:${latestEvent.code}:${latestEvent.occurredAt}`
            : null;

    const [initialEventSignature] = useState<string | null>(
        () => currentEventSignature,
    );

    const liveNewEventAnnouncement =
        latestEvent !== null && currentEventSignature !== initialEventSignature
            ? `Novo evento de rastreamento: ${latestEvent.title} em ${latestEvent.location}`
            : '';

    const isCopied =
        shipment !== null &&
        copiedCode !== null &&
        copiedCode === shipment.trackingCode;

    useEffect(() => {
        return () => {
            if (copyTimerRef.current !== null) {
                clearTimeout(copyTimerRef.current);
                copyTimerRef.current = null;
            }
        };
    }, []);

    const handleCopyTrackingCode = useCallback(async () => {
        if (!shipment?.trackingCode) {
            return;
        }

        const codeToCopy = shipment.trackingCode;

        try {
            if (
                typeof navigator !== 'undefined' &&
                navigator.clipboard &&
                typeof navigator.clipboard.writeText === 'function'
            ) {
                await navigator.clipboard.writeText(codeToCopy);
            } else if (typeof document !== 'undefined') {
                const textarea = document.createElement('textarea');
                textarea.value = codeToCopy;
                textarea.setAttribute('readonly', '');
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
        } catch {
            // Mantém confirmação visual/acessível mesmo em ambientes sem permissão de clipboard
        }

        setCopiedCode(codeToCopy);

        if (copyTimerRef.current !== null) {
            clearTimeout(copyTimerRef.current);
        }

        copyTimerRef.current = setTimeout(() => {
            setCopiedCode(null);
            copyTimerRef.current = null;
        }, COPY_FEEDBACK_DURATION_MS);
    }, [shipment]);

    const isDelivered =
        Boolean(shipment?.isDelivered) ||
        status === 'delivered' ||
        latestEvent?.code === 'delivered';

    return (
        <section
            aria-labelledby={headingId}
            className={cn(
                'flex flex-col gap-5 rounded-lg border border-border bg-card p-5 text-card-foreground sm:p-6',
                className,
            )}
        >
            {/* Região aria-live="polite" anunciando novos eventos de rastreamento apenas após o primeiro render */}
            <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
            >
                {liveNewEventAnnouncement}
            </div>

            {/* Região aria-live="polite" para confirmação acessível ao copiar o código de rastreio */}
            <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
            >
                {isCopied && shipment
                    ? `Código de rastreio ${shipment.trackingCode} copiado para a área de transferência.`
                    : ''}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border pb-3">
                <h2
                    id={headingId}
                    className="text-base font-semibold text-foreground sm:text-lg"
                >
                    {heading}
                </h2>

                {shipment !== null && (
                    <span
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs leading-none font-semibold',
                            isDelivered
                                ? 'border-success/35 bg-success-muted text-success-muted-foreground'
                                : 'border-brand/35 bg-brand-muted text-brand-muted-foreground',
                        )}
                    >
                        {isDelivered ? (
                            <>
                                <CheckCircle2
                                    className="size-3.5 shrink-0"
                                    aria-hidden="true"
                                />
                                <span>Entregue</span>
                            </>
                        ) : (
                            <>
                                <Truck
                                    className="size-3.5 shrink-0"
                                    aria-hidden="true"
                                />
                                <span>Em transporte</span>
                            </>
                        )}
                    </span>
                )}
            </div>

            {shipment === null ? (
                <div className="flex items-start gap-3.5 py-1">
                    <span
                        aria-hidden="true"
                        className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground"
                    >
                        <Truck className="size-4" />
                    </span>

                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <p className="text-sm font-semibold text-foreground sm:text-base">
                            O rastreamento aparece quando o pedido for enviado
                        </p>
                        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                            Assim que a carga sair do centro de distribuição, o
                            código de rastreio, a transportadora responsável e o
                            histórico de movimentações serão exibidos aqui
                            automaticamente.
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Cabeçalho com transportadora e código de rastreio copiável */}
                    <div className="flex flex-col justify-between gap-3 border-b border-border pb-4 sm:flex-row sm:items-center">
                        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 sm:gap-6">
                            <div className="flex flex-col gap-0.5">
                                <dt className="text-xs font-medium text-muted-foreground">
                                    Transportadora
                                </dt>
                                <dd className="font-semibold text-foreground">
                                    {shipment.carrier}
                                </dd>
                            </div>

                            <div className="flex flex-col gap-0.5">
                                <dt className="text-xs font-medium text-muted-foreground">
                                    Código de rastreio
                                </dt>
                                <dd className="font-mono font-bold tracking-tight text-foreground tabular-nums">
                                    {shipment.trackingCode}
                                </dd>
                            </div>
                        </dl>

                        <StoreButton
                            type="button"
                            variant="outline"
                            size="touch"
                            onClick={handleCopyTrackingCode}
                            aria-label={
                                isCopied
                                    ? `Código de rastreio ${shipment.trackingCode} copiado`
                                    : `Copiar código de rastreio ${shipment.trackingCode}`
                            }
                            className="w-full shrink-0 font-semibold sm:w-auto"
                        >
                            {isCopied ? (
                                <>
                                    <Check
                                        className="size-4 shrink-0 text-success"
                                        aria-hidden="true"
                                    />
                                    <span>Código copiado</span>
                                </>
                            ) : (
                                <>
                                    <Copy
                                        className="size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>Copiar código</span>
                                </>
                            )}
                        </StoreButton>
                    </div>

                    {/* Linha do tempo dos eventos de rastreio (mais recente no topo) */}
                    {shipment.events.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Aguardando o registro da primeira movimentação pela
                            transportadora.
                        </p>
                    ) : (
                        <ol
                            aria-label="Linha do tempo de rastreamento da entrega"
                            className="flex flex-col divide-y divide-border/70"
                        >
                            {shipment.events.map((event, index) => {
                                const isLatest = index === 0;
                                const isEventDelivered =
                                    event.code === 'delivered';
                                const formattedOccurredAt =
                                    formatShipmentEventDateTime(
                                        event.occurredAt,
                                    );

                                return (
                                    <li
                                        key={`${event.id}-${event.code}-${event.occurredAt}`}
                                        aria-current={
                                            isLatest ? 'step' : undefined
                                        }
                                        className={cn(
                                            'flex items-start gap-3.5 py-4 first:pt-1 last:pb-0',
                                            isLatest &&
                                                '-mx-2 rounded-md bg-muted/40 px-2 first:pt-3 last:pb-3 sm:-mx-3 sm:px-3',
                                        )}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={cn(
                                                'mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full border',
                                                isEventDelivered
                                                    ? 'border-success bg-success text-success-foreground'
                                                    : isLatest
                                                      ? 'border-brand bg-brand text-brand-foreground'
                                                      : 'border-border bg-muted text-muted-foreground',
                                            )}
                                        >
                                            <EventCodeIcon
                                                code={event.code}
                                                isLatest={isLatest}
                                            />
                                        </span>

                                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span
                                                    className={cn(
                                                        'text-sm leading-snug wrap-break-word sm:text-base',
                                                        isLatest ||
                                                            isEventDelivered
                                                            ? 'font-semibold text-foreground'
                                                            : 'font-medium text-foreground/90',
                                                    )}
                                                >
                                                    {event.title}
                                                </span>

                                                {isEventDelivered ? (
                                                    <span className="inline-flex items-center gap-1 rounded-sm border border-success/35 bg-success-muted px-2 py-0.5 text-xs font-semibold text-success-muted-foreground">
                                                        <CheckCircle2
                                                            className="size-3 shrink-0"
                                                            aria-hidden="true"
                                                        />
                                                        <span>Entregue</span>
                                                    </span>
                                                ) : isLatest ? (
                                                    <span className="inline-flex items-center gap-1 rounded-sm border border-brand/35 bg-brand-muted px-2 py-0.5 text-xs font-semibold text-brand-muted-foreground">
                                                        <Clock
                                                            className="size-3 shrink-0"
                                                            aria-hidden="true"
                                                        />
                                                        <span>
                                                            Evento atual
                                                        </span>
                                                    </span>
                                                ) : null}
                                            </div>

                                            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                                                {event.description}
                                            </p>

                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-xs text-muted-foreground">
                                                <span className="inline-flex items-center gap-1 font-medium text-foreground/85">
                                                    <MapPin
                                                        className="size-3.5 shrink-0 text-muted-foreground"
                                                        aria-hidden="true"
                                                    />
                                                    <span>
                                                        {event.location}
                                                    </span>
                                                </span>

                                                <time
                                                    dateTime={event.occurredAt}
                                                    className="tabular-nums"
                                                >
                                                    {formattedOccurredAt}
                                                </time>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </>
            )}
        </section>
    );
}

export default ShipmentTracking;
