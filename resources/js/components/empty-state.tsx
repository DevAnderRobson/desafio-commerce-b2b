import { Link } from '@inertiajs/react';
import { PackageOpen } from 'lucide-react';
import { StoreButton } from '@/components/button';
import { cn } from '@/lib/utils';
import type { EmptyStateProps } from '@/types/store';

/**
 * Estado vazio padronizado com orientação clara do próximo passo,
 * uma única ação primária com alvo >= 44px e sem aninhamento excessivo de cards.
 */
export function EmptyState({
    icon: Icon = PackageOpen,
    title,
    description,
    headingLevel = 'h2',
    actionLabel,
    actionHref,
    onAction,
    secondaryAction,
    children,
    className,
}: EmptyStateProps) {
    const HeadingTag = headingLevel;

    return (
        <section
            aria-label={title}
            className={cn(
                'flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 px-6 py-12 text-center sm:px-10 sm:py-16',
                className,
            )}
        >
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Icon className="size-6 stroke-[1.75]" aria-hidden="true" />
            </div>

            <HeadingTag className="max-w-md text-fluid-lg font-semibold text-foreground">
                {title}
            </HeadingTag>

            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                {description}
            </p>

            {(actionLabel || secondaryAction || children) && (
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    {actionLabel && actionHref && (
                        <StoreButton asChild size="touch">
                            <Link href={actionHref}>{actionLabel}</Link>
                        </StoreButton>
                    )}

                    {actionLabel && !actionHref && onAction && (
                        <StoreButton
                            type="button"
                            size="touch"
                            onClick={onAction}
                        >
                            {actionLabel}
                        </StoreButton>
                    )}

                    {secondaryAction}
                    {children}
                </div>
            )}
        </section>
    );
}

export default EmptyState;
