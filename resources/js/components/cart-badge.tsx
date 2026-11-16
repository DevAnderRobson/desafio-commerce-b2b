import { useEffect, useState } from 'react';
import { formatInteger } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CartBadgeProps } from '@/types/cart-ui';

const POP_DURATION_MS = 200;

/**
 * Contador de unidades do carrinho no navbar (item 5.2):
 * - Oculta o badge visual quando `count <= 0`.
 * - Exibe `99+` para quantidades acima de 99 unidades.
 * - Animação curta "pop" (~200ms ease-out) quando a quantidade aumenta,
 *   substituída por mudança instantânea sob `prefers-reduced-motion`.
 * - Região `aria-live="polite"` anunciando "N item/itens no carrinho".
 */
export function CartBadge({
    count,
    announceChanges = true,
    className,
}: CartBadgeProps) {
    const safeCount = Math.max(0, Math.trunc(count));
    const [prevCount, setPrevCount] = useState(safeCount);
    const [isPopping, setIsPopping] = useState(false);

    if (safeCount !== prevCount) {
        const didIncrease = safeCount > prevCount && safeCount > 0;
        setPrevCount(safeCount);
        setIsPopping(didIncrease);
    }

    useEffect(() => {
        if (!isPopping) {
            return;
        }

        const timerId = setTimeout(() => {
            setIsPopping(false);
        }, POP_DURATION_MS);

        return () => {
            clearTimeout(timerId);
        };
    }, [isPopping, safeCount]);

    const displayLabel = safeCount > 99 ? '99+' : formatInteger(safeCount);
    const liveAnnouncement =
        safeCount === 1
            ? '1 item no carrinho'
            : `${formatInteger(safeCount)} itens no carrinho`;

    return (
        <>
            {safeCount > 0 && (
                <span
                    aria-hidden="true"
                    data-popping={isPopping ? 'true' : undefined}
                    className={cn(
                        'ml-0.5 inline-flex min-w-5 items-center justify-center rounded-sm bg-brand px-1.5 py-0.5 text-xs leading-none font-semibold text-brand-foreground tabular-nums transition-transform duration-200 ease-out motion-reduce:scale-100 motion-reduce:transition-none',
                        isPopping ? 'scale-115' : 'scale-100',
                        className,
                    )}
                >
                    {displayLabel}
                </span>
            )}

            {announceChanges && (
                <span
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                    className="sr-only"
                >
                    {liveAnnouncement}
                </span>
            )}
        </>
    );
}

export default CartBadge;
