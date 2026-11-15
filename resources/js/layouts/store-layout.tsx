import { Link, usePage } from '@inertiajs/react';
import {
    Building2,
    Home,
    Menu,
    Search,
    ShoppingCart,
    User as UserIcon,
    X,
} from 'lucide-react';
import { createContext, useContext, useId, useState } from 'react';
import AppLogo from '@/components/app-logo';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { StoreButton } from '@/components/button';
import { NewsletterForm } from '@/components/newsletter-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';
import { home, login } from '@/routes';
import type { NavItem, StoreLayoutProps, User } from '@/types';

const StoreLayoutContext = createContext(false);

export function useIsInsideStoreLayout(): boolean {
    return useContext(StoreLayoutContext);
}

const defaultStoreNavItems: NavItem[] = [
    {
        title: 'Início',
        href: home(),
        icon: Home,
    },
    {
        title: 'Catálogo',
        href: '/buscar',
        icon: Search,
    },
];

/**
 * Layout principal da loja B2B (público e logado).
 * Mobile-first (320px a TV/ultrawide 3xl), container centralizado de 1440px,
 * landmarks semânticos, aria-live para busca/carrinho e slots de extensão para ondas futuras.
 */
export function StoreLayout({
    children,
    breadcrumbs = [],
    navItems = defaultStoreNavItems,
    searchQuery = '',
    searchPlaceholder = 'Buscar por nome, SKU, código EAN ou marca...',
    searchSlot,
    cartHref = '/carrinho',
    cartCount,
    cartSlot,
    accountHref,
    accountSlot,
    mobileMenuSlot,
    subHeaderSlot,
    newsletterSlot,
    footerSlot,
    mobileBottomBar,
    fullWidth = false,
    containerClassName,
}: StoreLayoutProps) {
    const isInsideStoreLayout = useContext(StoreLayoutContext);
    const page = usePage();
    const user = (page.props.auth as { user?: User | null } | undefined)?.user;
    const { isCurrentUrl } = useCurrentUrl();
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const searchInputId = useId();
    const mobileSearchInputId = useId();

    if (isInsideStoreLayout) {
        return <>{children}</>;
    }

    const resolvedAccountHref = accountHref ?? (user ? '/conta' : login());

    return (
        <StoreLayoutContext.Provider value={true}>
            <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
                {/* Skip link acessível para navegação por teclado e D-pad/TV */}
                <a
                    href="#main-content"
                    className="focus: sr-only inline-flex focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:min-h-11 focus:items-center focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg focus:ring-2 focus:ring-ring focus:outline-none"
                >
                    Pular para o conteúdo principal
                </a>

                <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 pt-safe backdrop-blur-xs supports-[backdrop-filter]:bg-background/90">
                    <div className="store-container flex min-h-16 items-center justify-between gap-2 py-2 sm:gap-4">
                        {/* Esquerda: Menu mobile + Logo + Links principais desktop */}
                        <div className="flex items-center gap-1.5 sm:gap-3">
                            <div className="lg:hidden">
                                <Sheet>
                                    <SheetTrigger asChild>
                                        <StoreButton
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            aria-label="Abrir menu de navegação"
                                        >
                                            <Menu
                                                className="size-5"
                                                aria-hidden="true"
                                            />
                                        </StoreButton>
                                    </SheetTrigger>
                                    <SheetContent
                                        side="left"
                                        className="flex w-72 max-w-[85vw] flex-col justify-between bg-background p-0"
                                    >
                                        <SheetHeader className="border-b border-border px-4 py-3.5 text-left">
                                            <SheetTitle className="flex items-center gap-2 text-base font-semibold">
                                                <AppLogo />
                                            </SheetTitle>
                                        </SheetHeader>

                                        <nav
                                            aria-label="Menu principal mobile"
                                            className="flex flex-1 flex-col justify-between overflow-y-auto p-4"
                                        >
                                            <div className="flex flex-col gap-1">
                                                {navItems.map((item) => {
                                                    const active = isCurrentUrl(
                                                        item.href,
                                                    );

                                                    return (
                                                        <Link
                                                            key={item.title}
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

                                                {mobileMenuSlot}
                                            </div>

                                            <div className="mt-6 flex flex-col gap-1 border-t border-border pt-4">
                                                <Link
                                                    href={resolvedAccountHref}
                                                    className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors duration-150 ease-out hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                                >
                                                    <UserIcon
                                                        className="size-4 shrink-0"
                                                        aria-hidden="true"
                                                    />
                                                    <span>
                                                        {user
                                                            ? `Minha conta (${user.name})`
                                                            : 'Entrar na conta B2B'}
                                                    </span>
                                                </Link>
                                                <Link
                                                    href={cartHref}
                                                    className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors duration-150 ease-out hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                                >
                                                    <ShoppingCart
                                                        className="size-4 shrink-0"
                                                        aria-hidden="true"
                                                    />
                                                    <span>
                                                        Carrinho de compras
                                                    </span>
                                                </Link>
                                            </div>
                                        </nav>
                                    </SheetContent>
                                </Sheet>
                            </div>

                            <Link
                                href={home()}
                                prefetch
                                className="inline-flex min-h-11 items-center gap-2 rounded-md px-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            >
                                <AppLogo />
                            </Link>

                            <nav
                                aria-label="Navegação principal"
                                className="ml-4 hidden items-center gap-1 lg:flex"
                            >
                                {navItems.map((item) => {
                                    const active = isCurrentUrl(item.href);

                                    return (
                                        <Link
                                            key={item.title}
                                            href={item.href}
                                            aria-current={
                                                active ? 'page' : undefined
                                            }
                                            className={cn(
                                                'inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                                                active
                                                    ? 'bg-secondary font-semibold text-foreground'
                                                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                                            )}
                                        >
                                            {item.title}
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* Centro: Busca estática/visual em telas >= sm ou slot customizado */}
                        <div className="hidden max-w-xl flex-1 md:block">
                            {searchSlot ?? (
                                <form
                                    role="search"
                                    aria-label="Buscar produtos no catálogo"
                                    onSubmit={(event) => event.preventDefault()}
                                    className="relative flex w-full items-center"
                                >
                                    <Label
                                        htmlFor={searchInputId}
                                        className="sr-only"
                                    >
                                        Buscar produtos no catálogo
                                    </Label>
                                    <Search
                                        className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                    <Input
                                        id={searchInputId}
                                        type="search"
                                        name="q"
                                        defaultValue={searchQuery}
                                        placeholder={searchPlaceholder}
                                        autoComplete="off"
                                        className="pr-24 pl-9"
                                    />
                                    <StoreButton
                                        type="submit"
                                        variant="secondary"
                                        size="sm"
                                        className="absolute right-1.5 min-h-8 px-3 text-xs font-semibold"
                                    >
                                        Buscar
                                    </StoreButton>
                                    <div
                                        aria-live="polite"
                                        aria-atomic="true"
                                        className="sr-only"
                                    />
                                </form>
                            )}
                        </div>

                        {/* Direita: Gatilho de busca mobile, Conta e Carrinho */}
                        <div className="flex items-center gap-1 sm:gap-2">
                            <div className="md:hidden">
                                <StoreButton
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-expanded={mobileSearchOpen}
                                    aria-controls="mobile-search-overlay"
                                    aria-label={
                                        mobileSearchOpen
                                            ? 'Fechar busca'
                                            : 'Abrir busca de produtos'
                                    }
                                    onClick={() =>
                                        setMobileSearchOpen((prev) => !prev)
                                    }
                                >
                                    {mobileSearchOpen ? (
                                        <X
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    ) : (
                                        <Search
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    )}
                                </StoreButton>
                            </div>

                            {accountSlot ?? (
                                <StoreButton
                                    variant="ghost"
                                    size="touch"
                                    asChild
                                    className="px-2.5 sm:px-3"
                                >
                                    <Link
                                        href={resolvedAccountHref}
                                        aria-label={
                                            user
                                                ? `Minha conta: ${user.name}`
                                                : 'Entrar na conta B2B'
                                        }
                                    >
                                        <UserIcon
                                            className="size-5 shrink-0"
                                            aria-hidden="true"
                                        />
                                        <span className="hidden text-sm font-medium sm:inline">
                                            {user ? 'Minha conta' : 'Entrar'}
                                        </span>
                                    </Link>
                                </StoreButton>
                            )}

                            {cartSlot ?? (
                                <StoreButton
                                    variant="outline"
                                    size="touch"
                                    asChild
                                    className="relative px-2.5 sm:px-3.5"
                                >
                                    <Link href={cartHref}>
                                        <ShoppingCart
                                            className="size-5 shrink-0"
                                            aria-hidden="true"
                                        />
                                        <span className="hidden text-sm font-medium sm:inline">
                                            Carrinho
                                        </span>
                                        <span
                                            aria-live="polite"
                                            aria-atomic="true"
                                            className={cn(
                                                'inline-flex items-center justify-center rounded-sm bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground tabular-nums',
                                                typeof cartCount === 'number'
                                                    ? 'ml-0.5'
                                                    : 'sr-only',
                                            )}
                                        >
                                            {typeof cartCount === 'number'
                                                ? cartCount
                                                : '0 itens no carrinho'}
                                        </span>
                                    </Link>
                                </StoreButton>
                            )}
                        </div>
                    </div>

                    {/* Overlay compacto de busca para celular pequeno (320px+) e tablet (< md) */}
                    {mobileSearchOpen && (
                        <div
                            id="mobile-search-overlay"
                            className="border-t border-border bg-background px-4 py-3 md:hidden"
                        >
                            {searchSlot ?? (
                                <form
                                    role="search"
                                    aria-label="Buscar produtos no catálogo"
                                    onSubmit={(event) => event.preventDefault()}
                                    className="flex items-center gap-2"
                                >
                                    <Label
                                        htmlFor={mobileSearchInputId}
                                        className="sr-only"
                                    >
                                        Buscar produtos
                                    </Label>
                                    <div className="relative flex-1">
                                        <Search
                                            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                                            aria-hidden="true"
                                        />
                                        <Input
                                            id={mobileSearchInputId}
                                            type="search"
                                            name="q"
                                            defaultValue={searchQuery}
                                            placeholder="Nome, SKU ou marca..."
                                            autoFocus
                                            className="pl-9"
                                        />
                                    </div>
                                    <StoreButton type="submit" size="touch">
                                        Buscar
                                    </StoreButton>
                                </form>
                            )}
                        </div>
                    )}

                    {subHeaderSlot}

                    {breadcrumbs.length > 0 && (
                        <div className="border-t border-border/70 bg-muted/30">
                            <div className="store-container flex min-h-11 items-center py-1.5">
                                <Breadcrumbs breadcrumbs={breadcrumbs} />
                            </div>
                        </div>
                    )}
                </header>

                <main
                    id="main-content"
                    tabIndex={-1}
                    className={cn(
                        'flex-1 outline-none',
                        !fullWidth && 'store-container py-6 sm:py-8 lg:py-10',
                        containerClassName,
                    )}
                >
                    {children}
                </main>

                <footer className="mt-auto border-t border-border bg-card text-card-foreground">
                    <div className="store-container py-10 lg:py-12">
                        {footerSlot ?? (
                            <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
                                <div className="flex flex-col gap-3 md:col-span-4">
                                    <div className="flex items-center gap-2">
                                        <Building2
                                            className="size-5 text-foreground"
                                            aria-hidden="true"
                                        />
                                        <span className="text-base font-semibold text-foreground">
                                            Portal de Compras B2B
                                        </span>
                                    </div>
                                    <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                                        Fornecimento corporativo com tabelas de
                                        preço Padrão e Atacadista, condições a
                                        prazo e gestão de múltiplos compradores
                                        por empresa.
                                    </p>
                                </div>

                                <nav
                                    aria-label="Links institucionais e catálogo"
                                    className="grid grid-cols-2 gap-6 sm:grid-cols-2 md:col-span-4"
                                >
                                    <div className="flex flex-col gap-2">
                                        <h2 className="text-sm font-semibold text-foreground">
                                            Navegação
                                        </h2>
                                        <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                                            <li>
                                                <Link
                                                    href={home()}
                                                    className="inline-flex min-h-11 items-center hover:text-foreground hover:underline focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                                >
                                                    Vitrine principal
                                                </Link>
                                            </li>
                                            <li>
                                                <Link
                                                    href="/buscar"
                                                    className="inline-flex min-h-11 items-center hover:text-foreground hover:underline focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                                >
                                                    Busca avançada
                                                </Link>
                                            </li>
                                        </ul>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <h2 className="text-sm font-semibold text-foreground">
                                            Área do cliente
                                        </h2>
                                        <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                                            <li>
                                                <Link
                                                    href={resolvedAccountHref}
                                                    className="inline-flex min-h-11 items-center hover:text-foreground hover:underline focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                                >
                                                    Minha conta
                                                </Link>
                                            </li>
                                            <li>
                                                <Link
                                                    href="/conta/pedidos"
                                                    className="inline-flex min-h-11 items-center hover:text-foreground hover:underline focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                                >
                                                    Pedidos da empresa
                                                </Link>
                                            </li>
                                        </ul>
                                    </div>
                                </nav>

                                <div className="flex flex-col gap-3 md:col-span-4">
                                    {newsletterSlot ?? <NewsletterForm />}
                                </div>
                            </div>
                        )}

                        <div className="mt-8 flex flex-col items-start justify-between gap-2 border-t border-border/70 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
                            <p>
                                Preços exclusivos para empresas cadastradas e
                                aprovadas. Valores expressos em Reais (R$).
                            </p>
                            <p>Atendimento comercial B2B</p>
                        </div>
                    </div>
                </footer>

                {mobileBottomBar && (
                    <div className="sticky bottom-0 z-40 border-t border-border bg-background/95 pt-2.5 px-safe pb-safe backdrop-blur-xs md:hidden">
                        {mobileBottomBar}
                    </div>
                )}
            </div>
        </StoreLayoutContext.Provider>
    );
}

export default StoreLayout;
