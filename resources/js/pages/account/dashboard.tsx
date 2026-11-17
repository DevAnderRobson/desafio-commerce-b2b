import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Heart,
    MapPin,
    PackageCheck,
    Settings,
    ShoppingBag,
    Users,
} from 'lucide-react';
import { CompanyCreditPanel } from '@/components/account/company-credit-panel';
import { CompanyStatusBanner } from '@/components/account/company-status-banner';
import { OrdersResponsiveList } from '@/components/account/order-status-badge';
import { StoreButton } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { formatInteger } from '@/lib/format';
import { dashboard } from '@/routes/account';
import type { AccountDashboardProps } from '@/types/account';

export default function AccountDashboard({
    accountCompany,
    credit,
    recentOrders,
    counts,
    routes,
}: AccountDashboardProps) {
    const shortcuts = [
        {
            key: 'orders',
            title: 'Pedidos da empresa',
            description: 'Histórico, acompanhamento e repetição de pedidos.',
            countText: `${formatInteger(counts.orders)} ${counts.orders === 1 ? 'pedido' : 'pedidos'}`,
            href: routes.orders,
            icon: PackageCheck,
        },
        {
            key: 'addresses',
            title: 'Endereços de entrega',
            description: 'Unidades e locais de recebimento da empresa.',
            countText: `${formatInteger(counts.addresses)} ${counts.addresses === 1 ? 'endereço' : 'endereços'}`,
            href: routes.addresses,
            icon: MapPin,
        },
        {
            key: 'wishlist',
            title: 'Lista de desejos',
            description: 'Itens salvos pelo seu usuário para cotação futura.',
            countText: `${formatInteger(counts.wishlist)} ${counts.wishlist === 1 ? 'item' : 'itens'}`,
            href: routes.wishlist,
            icon: Heart,
        },
        ...(routes.users
            ? [
                  {
                      key: 'users',
                      title: 'Usuários da empresa',
                      description:
                          'Compradores vinculados ao CNPJ da sua empresa.',
                      countText: 'Gerenciar acessos',
                      href: routes.users,
                      icon: Users,
                  },
              ]
            : []),
        {
            key: 'settings',
            title: 'Configurações',
            description: 'Dados do seu perfil, senha e segurança da conta.',
            countText: 'Perfil e acesso',
            href: routes.settings,
            icon: Settings,
        },
    ];

    return (
        <>
            <Head title="Resumo da conta" />

            <div className="flex flex-col gap-8">
                {/* 1. Empresa, modelo de compra em texto e avisos de aprovação/bloqueio */}
                <CompanyStatusBanner
                    company={accountCompany}
                    shopHref={routes.shop}
                />

                {/* 2. Limite de crédito corporativo (oculto quando credit === null) */}
                {credit !== null && <CompanyCreditPanel credit={credit} />}

                {/* 3. Pedidos recentes da empresa */}
                <section
                    aria-labelledby="recent-orders-heading"
                    className="flex flex-col gap-4"
                >
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div className="flex flex-col gap-0.5">
                            <h2
                                id="recent-orders-heading"
                                className="text-fluid-lg font-semibold tracking-tight text-foreground"
                            >
                                Pedidos recentes
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Últimos pedidos realizados pelos compradores da
                                sua empresa.
                            </p>
                        </div>

                        {(recentOrders.length > 0 || counts.orders > 0) && (
                            <StoreButton
                                variant="ghost"
                                size="touch"
                                asChild
                                className="font-semibold text-brand-muted-foreground hover:text-foreground"
                            >
                                <Link href={routes.orders}>
                                    <span>
                                        Ver todos (
                                        {formatInteger(counts.orders)})
                                    </span>
                                    <ArrowRight
                                        className="size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                </Link>
                            </StoreButton>
                        )}
                    </div>

                    {recentOrders.length === 0 ? (
                        <EmptyState
                            icon={ShoppingBag}
                            headingLevel="h3"
                            title="Sua empresa ainda não tem pedidos registrados"
                            description="Consulte o catálogo corporativo para adicionar itens ao carrinho e realizar o primeiro pedido da empresa."
                            actionLabel="Ir para a loja"
                            actionHref={routes.shop}
                        />
                    ) : (
                        <OrdersResponsiveList orders={recentOrders} compact />
                    )}
                </section>

                {/* 4. Contagens e atalhos rápidos da área do cliente */}
                <section
                    aria-labelledby="account-shortcuts-heading"
                    className="flex flex-col gap-4"
                >
                    <div className="flex flex-col gap-0.5">
                        <h2
                            id="account-shortcuts-heading"
                            className="text-fluid-lg font-semibold tracking-tight text-foreground"
                        >
                            Atalhos e gestão da conta
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Acesse rapidamente os recursos da empresa e do seu
                            usuário.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {shortcuts.map((item) => {
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.key}
                                    href={item.href}
                                    className="group flex min-h-11 flex-col justify-between gap-4 rounded-lg border border-border bg-card p-4 text-card-foreground transition-colors duration-150 ease-out hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none motion-reduce:transition-none sm:p-5"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 flex-col gap-1">
                                            <h3 className="flex items-center gap-2 text-base font-semibold text-foreground group-hover:underline">
                                                <Icon
                                                    className="size-4 shrink-0 text-muted-foreground"
                                                    aria-hidden="true"
                                                />
                                                <span>{item.title}</span>
                                            </h3>
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                {item.description}
                                            </p>
                                        </div>

                                        <ArrowRight
                                            className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-hover:text-foreground motion-reduce:transition-none"
                                            aria-hidden="true"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between border-t border-border/70 pt-2.5 text-xs font-semibold text-foreground tabular-nums">
                                        <span>{item.countText}</span>
                                        <span className="text-brand-muted-foreground group-hover:text-foreground">
                                            Acessar
                                        </span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            </div>
        </>
    );
}

AccountDashboard.layout = {
    title: 'Resumo da conta',
    breadcrumbs: [
        {
            title: 'Resumo da conta',
            href: dashboard(),
        },
    ],
};
