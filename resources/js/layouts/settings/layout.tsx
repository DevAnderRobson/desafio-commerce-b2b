import { Link } from '@inertiajs/react';
import { ShieldCheck, SunMoon, User } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit as editProfile } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

const settingsNavItems: NavItem[] = [
    {
        title: 'Perfil',
        href: editProfile(),
        icon: User,
    },
    {
        title: 'Segurança e 2FA',
        href: editSecurity(),
        icon: ShieldCheck,
    },
    {
        title: 'Aparência',
        href: editAppearance(),
        icon: SunMoon,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <div className="flex flex-col gap-6">
            <nav
                aria-label="Seções de configurações"
                className="flex flex-wrap gap-1.5 border-b border-border pb-3"
            >
                {settingsNavItems.map((item) => {
                    const active = isCurrentOrParentUrl(item.href);

                    return (
                        <Link
                            key={toUrl(item.href)}
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                'inline-flex min-h-11 items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                                active
                                    ? 'bg-secondary font-semibold text-foreground'
                                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                            )}
                        >
                            {item.icon && (
                                <item.icon
                                    className="size-4 shrink-0"
                                    aria-hidden="true"
                                />
                            )}
                            <span>{item.title}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="max-w-2xl">
                <div className="flex flex-col gap-10">{children}</div>
            </div>
        </div>
    );
}
