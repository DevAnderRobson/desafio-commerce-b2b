import { Link, router, usePage } from '@inertiajs/react';
import {
    Heart,
    LayoutDashboard,
    LogOut,
    MapPin,
    Menu,
    PackageCheck,
    Settings,
    Users,
} from 'lucide-react';
import { createContext, useContext } from 'react';
import { StoreButton } from '@/components/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { StoreLayout, useIsInsideStoreLayout } from '@/layouts/store-layout';
import { cn, toUrl } from '@/lib/utils';
import { logout } from '@/routes';
import { edit as editProfile } from '@/routes/profile';
import type { AccountLayoutProps, CompanyContext, NavItem } from '@/types';

const AccountLayoutContext = createContext(false);

export function getDefaultAccountNavItems(showCompanyUsers = true): NavItem[] {
    const items: NavItem[] = [
        {
            title: 'Resumo da conta',
            href: '/conta',
            icon: LayoutDashboard,
        },
        {
            title: 'Pedidos da empresa',
            href: '/conta/pedidos',
            icon: PackageCheck,
        },
        {
            title: 'Endereços',
            href: '/conta/enderecos',
            icon: MapPin,
        },
    ];

    if (showCompanyUsers) {
        items.push({
            title: 'Usuários da empresa',
            href: '/conta/usuarios',
            icon: Users,
        });
    }

    items.push(
        {
            title: 'Lista de desejos',
            href: '/conta/desejos',
            icon: Heart,
        },
        {
            title: 'Configurações',
            href: editProfile(),
            icon: Settings,
        },
    );

    return items;
}

/**
 * Layout da Área do Cliente B2B.
 * Navegação lateral fixa em desktop (lg+) e combinação de abas horizontais + menu em gaveta no mobile (< lg).
 */
export function AccountLayout({
    children,
    title = 'Área do cliente',
    description = 'Acompanhe pedidos da empresa, limite de crédito, endereços e usuários vinculados.',
    breadcrumbs = [],
    navItems,
    showCompanyUsers,
    withStoreHeader = true,
    headerActionsSlot,
    sidebarFooterSlot,
    mobileBottomBar,
}: AccountLayoutProps) {
    const isInsideAccountLayout = useContext(AccountLayoutContext);
    const isInsideStoreLayout = useIsInsideStoreLayout();
    const page = usePage();
    const company =
        (page.props.company as CompanyContext | null | undefined) ?? null;
    const { isCurrentUrl, isCurrentOrParentUrl } = useCurrentUrl();
    const resolvedShowCompanyUsers =
        showCompanyUsers ?? (company ? company.is_owner : true);
    const resolvedNavItems =
        navItems ?? getDefaultAccountNavItems(resolvedShowCompanyUsers);

    if (isInsideAccountLayout) {
        return <>{children}</>;
    }

    const resolveNavItemActive = (item: NavItem): boolean => {
        if (item.isActive !== undefined) {
            return item.isActive;
        }

        const itemPath = toUrl(item.href);
        if (itemPath === '/conta') {
            return isCurrentUrl('/conta');
        }

        if (itemPath.startsWith('/settings')) {
            return isCurrentOrParentUrl('/settings');
        }

        return isCurrentOrParentUrl(item.href);
    };

    const handleLogout = () => {
        router.flushAll();
    };

    const content = (
        <AccountLayoutContext.Provider value={true}>
            <div className="flex flex-col gap-6 lg:gap-8">
                {/* Cabeçalho da área do cliente */}
                <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-end">
                    <div className="flex flex-col gap-1">
                        <h1 className="font-semibold tracking-tight text-foreground">
                            {title}
                        </h1>
                        {description && (
                            <p className="max-w-2xl text-sm text-muted-foreground">
                                {description}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {headerActionsSlot}

                        {/* Menu em gaveta complementar para celulares pequenos (320-374px) */}
                        <div className="lg:hidden">
                            <Sheet>
                                <SheetTrigger asChild>
                                    <StoreButton
                                        type="button"
                                        variant="outline"
                                        size="touch"
                                        aria-label="Abrir menu completo da conta"
                                    >
                                        <Menu
                                            className="size-4 shrink-0"
                                            aria-hidden="true"
                                        />
                                        <span>Menu da conta</span>
                                    </StoreButton>
                                </SheetTrigger>
                                <SheetContent
                                    side="left"
                                    className="flex w-72 max-w-[85vw] flex-col bg-background p-0"
                                >
                                    <SheetHeader className="border-b border-border px-4 py-3.5 text-left">
                                        <SheetTitle className="text-base font-semibold">
                                            {title}
                                        </SheetTitle>
                                    </SheetHeader>
                                    <nav
                                        aria-label="Menu da conta mobile"
                                        className="flex flex-1 flex-col justify-between overflow-y-auto p-4"
                                    >
                                        <div className="flex flex-col gap-1">
                                            {resolvedNavItems.map((item) => {
                                                const active =
                                                    resolveNavItemActive(item);

                                                return (
                                                    <Link
                                                        key={toUrl(item.href)}
                                                        href={item.href}
                                                        aria-current={
                                                            active
                                                                ? 'page'
                                                                : undefined
                                                        }
                                                        className={cn(
                                                            'flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
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
                                                        <span>
                                                            {item.title}
                                                        </span>
                                                    </Link>
                                                );
                                            })}
                                        </div>

                                        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                                            {sidebarFooterSlot}
                                            <Link
                                                href={logout()}
                                                as="button"
                                                onClick={handleLogout}
                                                data-test="account-mobile-logout-button"
                                                className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-destructive transition-colors duration-150 ease-out hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                            >
                                                <LogOut
                                                    className="size-4 shrink-0"
                                                    aria-hidden="true"
                                                />
                                                <span>Sair</span>
                                            </Link>
                                        </div>
                                    </nav>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>
                </div>

                {/* Abas horizontais no mobile/tablet (< lg) com alvo >= 44px */}
                <nav
                    aria-label="Abas da área do cliente"
                    className="-mx-4 flex gap-1.5 overflow-x-auto border-b border-border px-4 pb-2 sm:-mx-6 sm:px-6 lg:hidden"
                >
                    {resolvedNavItems.map((item) => {
                        const active = resolveNavItemActive(item);

                        return (
                            <Link
                                key={toUrl(item.href)}
                                href={item.href}
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                    'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                                    active
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground',
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

                {/* Corpo: Navegação lateral no desktop (lg+) + área de conteúdo */}
                <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
                    <aside
                        aria-label="Navegação lateral da conta"
                        className="hidden lg:sticky lg:top-24 lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:gap-4"
                    >
                        <nav
                            aria-label="Menu da área do cliente"
                            className="flex flex-col gap-1"
                        >
                            {resolvedNavItems.map((item) => {
                                const active = resolveNavItemActive(item);

                                return (
                                    <Link
                                        key={toUrl(item.href)}
                                        href={item.href}
                                        aria-current={
                                            active ? 'page' : undefined
                                        }
                                        className={cn(
                                            'flex min-h-11 items-center gap-3 rounded-md px-3.5 py-2.5 text-sm font-medium transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
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

                        <div className="flex flex-col gap-2 border-t border-border pt-4">
                            {sidebarFooterSlot}
                            <Link
                                href={logout()}
                                as="button"
                                onClick={handleLogout}
                                data-test="account-sidebar-logout-button"
                                className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-md px-3.5 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors duration-150 ease-out hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            >
                                <LogOut
                                    className="size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <span>Sair</span>
                            </Link>
                        </div>
                    </aside>

                    <div className="min-w-0 flex-1">{children}</div>
                </div>
            </div>
        </AccountLayoutContext.Provider>
    );

    if (!withStoreHeader || isInsideStoreLayout) {
        return content;
    }

    return (
        <StoreLayout
            breadcrumbs={breadcrumbs}
            mobileBottomBar={mobileBottomBar}
        >
            {content}
        </StoreLayout>
    );
}

export default AccountLayout;
