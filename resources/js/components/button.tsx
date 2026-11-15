import type { VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { Button as UiButton, buttonVariants } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

export type StoreButtonProps = ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean;
        loading?: boolean;
        loadingText?: string;
    };

export function StoreButton({
    children,
    disabled,
    loading = false,
    loadingText,
    asChild = false,
    ...props
}: StoreButtonProps) {
    if (asChild) {
        return (
            <UiButton asChild disabled={disabled || loading} {...props}>
                {children}
            </UiButton>
        );
    }

    return (
        <UiButton
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            {...props}
        >
            {loading && <Spinner className="size-4 shrink-0" />}
            {loading && loadingText ? loadingText : children}
        </UiButton>
    );
}

export { UiButton as Button, buttonVariants };
export default StoreButton;
