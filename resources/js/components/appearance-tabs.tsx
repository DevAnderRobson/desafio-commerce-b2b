import type { LucideIcon } from 'lucide-react';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import type { Appearance } from '@/hooks/use-appearance';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

export default function AppearanceToggleTab({
    className = '',
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    const { appearance, updateAppearance } = useAppearance();

    const tabs: { value: Appearance; icon: LucideIcon; label: string }[] = [
        { value: 'light', icon: Sun, label: 'Claro' },
        { value: 'dark', icon: Moon, label: 'Escuro' },
        { value: 'system', icon: Monitor, label: 'Sistema' },
    ];

    return (
        <div
            role="group"
            aria-label="Preferência de tema"
            className={cn(
                'inline-flex flex-wrap gap-1.5 rounded-lg border border-border bg-muted/60 p-1',
                className,
            )}
            {...props}
        >
            {tabs.map(({ value, icon: Icon, label }) => {
                const active = appearance === value;

                return (
                    <button
                        key={value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => updateAppearance(value)}
                        className={cn(
                            'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                            active
                                ? 'bg-card font-semibold text-foreground shadow-xs'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                        )}
                    >
                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                        <span>{label}</span>
                    </button>
                );
            })}
        </div>
    );
}
