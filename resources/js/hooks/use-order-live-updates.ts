import { useConnectionStatus, useEcho } from '@laravel/echo-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { OrderUpdatedEvent } from '@/types/order';

export type UseOrderLiveUpdatesOptions = {
    number: string;
    onUpdate?: (event: OrderUpdatedEvent) => void;
};

export type UseOrderLiveUpdatesReturn = {
    isLive: boolean;
    lastEvent: OrderUpdatedEvent | null;
};

type ScopedOrderEvent = {
    orderNumber: string;
    event: OrderUpdatedEvent;
};

/**
 * Assina o canal privado `orders.{number}` via Laravel Echo (Reverb) para escutar
 * o evento `.order.updated` sem trafegar dados sensíveis no socket.
 *
 * - Mantém `onUpdate` estável via ref para nunca reassinar o canal a cada render.
 * - Expõe `isLive` (`useConnectionStatus() === 'connected'`) para alternar entre
 *   tempo real (com batimento lento de segurança) e fallback de polling progressivo.
 * - Expõe `lastEvent` com o último payload recebido para o pedido atual.
 */
export function useOrderLiveUpdates(
    number: string,
    onUpdate?: (event: OrderUpdatedEvent) => void,
): UseOrderLiveUpdatesReturn;
export function useOrderLiveUpdates(
    options: UseOrderLiveUpdatesOptions,
): UseOrderLiveUpdatesReturn;
export function useOrderLiveUpdates(
    numberOrOptions: string | UseOrderLiveUpdatesOptions,
    maybeOnUpdate?: (event: OrderUpdatedEvent) => void,
): UseOrderLiveUpdatesReturn {
    const orderNumber =
        typeof numberOrOptions === 'string'
            ? numberOrOptions
            : numberOrOptions.number;
    const onUpdate =
        typeof numberOrOptions === 'string'
            ? maybeOnUpdate
            : numberOrOptions.onUpdate;

    const connectionStatus = useConnectionStatus();
    const isLive = connectionStatus === 'connected';

    const [scopedEvent, setScopedEvent] = useState<ScopedOrderEvent | null>(
        null,
    );

    const onUpdateRef = useRef(onUpdate);

    useEffect(() => {
        onUpdateRef.current = onUpdate;
    }, [onUpdate]);

    const handleOrderUpdated = useCallback(
        (payload: OrderUpdatedEvent): void => {
            if (!payload || payload.number !== orderNumber) {
                return;
            }

            setScopedEvent({
                orderNumber,
                event: payload,
            });

            onUpdateRef.current?.(payload);
        },
        [orderNumber],
    );

    useEcho<OrderUpdatedEvent>(
        `orders.${orderNumber}`,
        '.order.updated',
        handleOrderUpdated,
        [handleOrderUpdated],
        'private',
    );

    const lastEvent =
        scopedEvent !== null && scopedEvent.orderNumber === orderNumber
            ? scopedEvent.event
            : null;

    return {
        isLive,
        lastEvent,
    };
}

export default useOrderLiveUpdates;
