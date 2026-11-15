import { useFlashToast } from '@/hooks/use-flash-toast';
import { useAppearance } from '@/hooks/use-appearance';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

function Toaster({ ...props }: ToasterProps) {
    const { appearance } = useAppearance();

    useFlashToast();

    return (
        <Sonner
            theme={appearance}
            className="toaster group"
            position="bottom-right"
            closeButton
            toastOptions={{
                classNames: {
                    toast: 'group toast rounded-lg border border-border bg-popover text-popover-foreground shadow-md',
                    title: 'text-sm font-semibold text-foreground',
                    description: 'text-sm text-muted-foreground',
                    actionButton:
                        'min-h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium',
                    cancelButton:
                        'min-h-9 px-3 rounded-md bg-secondary text-secondary-foreground text-xs font-medium',
                },
            }}
            style={
                {
                    '--normal-bg': 'var(--popover)',
                    '--normal-text': 'var(--popover-foreground)',
                    '--normal-border': 'var(--border)',
                } as React.CSSProperties
            }
            {...props}
        />
    );
}

export { Toaster };
