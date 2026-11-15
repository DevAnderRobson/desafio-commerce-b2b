import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { Badge } from '@/components/ui/badge';
import { formatCentsToBRL, formatInteger } from '@/lib/format';
import { cn } from '@/lib/utils';

const priceBadgeVariants = cva(
    'inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-semibold tabular-nums transition-colors duration-150 ease-out',
    {
        variants: {
            variant: {
                promo: 'border-brand/25 bg-brand-muted text-brand-muted-foreground',
                wholesale:
                    'border-success/25 bg-success-muted text-success-muted-foreground',
                savings:
                    'border-success/25 bg-success-muted text-success-muted-foreground',
                warning:
                    'border-warning/30 bg-warning-muted text-warning-muted-foreground',
                neutral: 'border-border bg-secondary text-secondary-foreground',
            },
        },
        defaultVariants: {
            variant: 'neutral',
        },
    },
);

export type PriceBadgeProps = ComponentProps<'span'> &
    VariantProps<typeof priceBadgeVariants> & {
        /** Percentual de desconto (ex.: 15 renderiza "-15%"). */
        discountPercent?: number | null;
        /** Quantidade mínima de atacado (ex.: 10). */
        wholesaleMinQuantity?: number | null;
        /** Preço unitário no atacado em centavos. */
        wholesalePriceCents?: number | null;
        /** Economia por unidade em centavos. */
        savingsCents?: number | null;
    };

/**
 * Selo semântico para exibição de promoção, faixa de atacado ou economia unitária.
 * Mantém contraste >= 4,5:1 nos temas claro e escuro, sem ornamentos de "AI slop".
 */
export function PriceBadge({
    className,
    variant,
    discountPercent,
    wholesaleMinQuantity,
    wholesalePriceCents,
    savingsCents,
    children,
    ...props
}: PriceBadgeProps) {
    let resolvedVariant = variant;
    let content = children;
    let ariaLabel = props['aria-label'];

    if (!content) {
        if (typeof discountPercent === 'number' && discountPercent > 0) {
            resolvedVariant = resolvedVariant ?? 'promo';
            content = `-${discountPercent}%`;
            ariaLabel =
                ariaLabel ?? `Desconto promocional de ${discountPercent}%`;
        } else if (
            typeof wholesaleMinQuantity === 'number' &&
            wholesaleMinQuantity > 0 &&
            typeof wholesalePriceCents === 'number'
        ) {
            resolvedVariant = resolvedVariant ?? 'wholesale';
            content = `A partir de ${formatInteger(wholesaleMinQuantity)} un.: ${formatCentsToBRL(wholesalePriceCents)}`;
        } else if (typeof savingsCents === 'number' && savingsCents > 0) {
            resolvedVariant = resolvedVariant ?? 'savings';
            content = `Economize ${formatCentsToBRL(savingsCents)}/un.`;
        }
    }

    if (!content) {
        return null;
    }

    return (
        <Badge
            variant="outline"
            aria-label={ariaLabel}
            className={cn(
                priceBadgeVariants({ variant: resolvedVariant }),
                className,
            )}
            {...props}
        >
            {content}
        </Badge>
    );
}

export { priceBadgeVariants };
export default PriceBadge;
