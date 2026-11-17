import { StoreLayout, useIsInsideStoreLayout } from '@/layouts/store-layout';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const isInsideStoreLayout = useIsInsideStoreLayout();

    const content = (
        <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-4 sm:py-8">
            {(title || description) && (
                <header className="flex flex-col gap-1.5">
                    {title && (
                        <h1 className="text-fluid-2xl font-semibold tracking-tight text-foreground">
                            {title}
                        </h1>
                    )}
                    {description && (
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            {description}
                        </p>
                    )}
                </header>
            )}

            <div className="rounded-lg border border-border bg-card p-5 text-card-foreground sm:p-6">
                {children}
            </div>
        </div>
    );

    if (isInsideStoreLayout) {
        return content;
    }

    return <StoreLayout>{content}</StoreLayout>;
}
