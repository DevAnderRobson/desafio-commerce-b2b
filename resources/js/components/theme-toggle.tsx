import { Moon, Sun } from 'lucide-react';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

export type ThemeToggleProps = {
    className?: string;
};

/**
 * Botão flutuante global para alternar entre tema claro e escuro em qualquer página.
 * Respeita a preferência inicial do sistema ('system'), garante alvo mínimo de 44x44px,
 * contraste >= 4.5:1, foco visível para teclado/TV e deslocamento seguro acima de barras inferiores no mobile.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';

    const handleToggle = () => {
        updateAppearance(isDark ? 'light' : 'dark');
    };

    const actionLabel = isDark
        ? 'Mudar para tema claro'
        : 'Mudar para tema escuro';

    const currentThemeText = isDark ? 'Tema escuro' : 'Tema claro';

    return (
        <button
            type="button"
            onClick={handleToggle}
            aria-label={actionLabel}
            aria-pressed={isDark}
            title={actionLabel}
            data-test="theme-toggle"
            className={cn(
                'fixed right-[max(0.75rem,env(safe-area-inset-right,0px))] bottom-[calc(6.5rem+env(safe-area-inset-bottom,0px))] z-40 inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-border bg-card/95 px-3 py-2 text-xs font-semibold text-card-foreground shadow-md backdrop-blur-xs transition-colors duration-150 ease-out hover:border-foreground/30 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none motion-reduce:transition-none sm:right-[max(1.25rem,env(safe-area-inset-right,0px))] lg:bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))]',
                className,
            )}
        >
            {isDark ? (
                <Sun
                    className="size-4 shrink-0 text-warning"
                    aria-hidden="true"
                />
            ) : (
                <Moon
                    className="size-4 shrink-0 text-foreground"
                    aria-hidden="true"
                />
            )}
            <span className="sr-only sm:not-sr-only">
                {isDark ? 'Claro' : 'Escuro'}
            </span>
            <span className="sr-only">({currentThemeText} ativo)</span>
        </button>
    );
}

export default ThemeToggle;
