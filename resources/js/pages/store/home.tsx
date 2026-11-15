import { Deferred, Head, Link, usePage } from '@inertiajs/react';
import { ArrowDownRight, ArrowRight } from 'lucide-react';
import { StoreButton } from '@/components/button';
import {
    ProductCardSkeleton,
    ProductGridSkeleton,
} from '@/components/product-card-skeleton';
import { ProductCarousel } from '@/components/product-carousel';
import { Skeleton } from '@/components/ui/skeleton';
import { login, register } from '@/routes';
import type { CompanyContext, User } from '@/types/auth';
import type { HomeCategory, HomePageProps, HomeProduct } from '@/types/home';

type DeferredShowcaseSectionProps = {
    id?: string;
    dataKey: 'promotions' | 'bestSellers' | 'featured';
    title: string;
    subtitle: string;
    items?: HomeProduct[];
};

function ShowcaseSectionSkeleton({
    id,
    title,
}: {
    id?: string;
    title: string;
}) {
    return (
        <section
            id={id}
            aria-label={`Carregando seção ${title}`}
            aria-busy="true"
            className="flex scroll-mt-20 flex-col gap-4 sm:gap-5"
        >
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                    <h2 className="text-fluid-xl font-semibold text-foreground">
                        {title}
                    </h2>
                    <Skeleton className="h-4 w-64 max-w-full" />
                </div>
                <div className="hidden items-center gap-1.5 sm:flex">
                    <Skeleton className="size-11 rounded-md" />
                    <Skeleton className="size-11 rounded-md" />
                </div>
            </div>

            {/* Mobile/tablet (< lg): faixa estilo carrossel com ProductCardSkeleton; desktop: ProductGridSkeleton */}
            <div className="flex gap-4 overflow-hidden lg:hidden">
                <div className="w-[68%] shrink-0 min-[480px]:w-[58%] sm:w-[calc((100%-1rem)/2.25)] md:w-[calc((100%-2rem)/3)]">
                    <ProductCardSkeleton />
                </div>
                <div className="w-[68%] shrink-0 min-[480px]:w-[58%] sm:w-[calc((100%-1rem)/2.25)] md:w-[calc((100%-2rem)/3)]">
                    <ProductCardSkeleton />
                </div>
                <div className="hidden shrink-0 md:block md:w-[calc((100%-2rem)/3)]">
                    <ProductCardSkeleton />
                </div>
            </div>

            <ProductGridSkeleton
                count={6}
                className="hidden lg:grid lg:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 [&>*:nth-child(5)]:hidden 2xl:[&>*:nth-child(5)]:flex [&>*:nth-child(6)]:hidden 3xl:[&>*:nth-child(6)]:flex"
            />
        </section>
    );
}

function DeferredShowcaseSection({
    id,
    dataKey,
    title,
    subtitle,
    items,
}: DeferredShowcaseSectionProps) {
    return (
        <Deferred
            data={dataKey}
            fallback={<ShowcaseSectionSkeleton id={id} title={title} />}
        >
            {items && items.length > 0 ? (
                <ProductCarousel
                    id={id}
                    title={title}
                    subtitle={subtitle}
                    items={items}
                    headingLevel="h2"
                    cardHeadingLevel="h3"
                />
            ) : null}
        </Deferred>
    );
}

function CategoryShortcutsSection({
    categories,
}: {
    categories: HomeCategory[];
}) {
    if (categories.length === 0) {
        return null;
    }

    return (
        <section
            aria-labelledby="categorias-heading"
            className="flex flex-col gap-4"
        >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2
                    id="categorias-heading"
                    className="text-fluid-xl font-semibold text-foreground"
                >
                    Departamentos de abastecimento
                </h2>
                <Link
                    href="/buscar"
                    className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                    <span>Ver catálogo completo</span>
                    <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
            </div>

            <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                {categories.map((category) => (
                    <li key={category.id}>
                        <Link
                            href={category.href}
                            prefetch
                            className="group flex min-h-14 w-full items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-card-foreground transition-[border-color,background-color] duration-150 ease-out hover:border-foreground/30 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
                        >
                            <div className="flex min-w-0 flex-col">
                                <span className="truncate text-sm font-semibold text-foreground">
                                    {category.name}
                                </span>
                                <span className="text-xs text-muted-foreground tabular-nums">
                                    {category.productCount}{' '}
                                    {category.productCount === 1
                                        ? 'item ativo'
                                        : 'itens ativos'}
                                </span>
                            </div>
                            <ArrowRight
                                className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-hover:text-foreground motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                                aria-hidden="true"
                            />
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}

export default function StoreHome({
    categories,
    promotions,
    bestSellers,
    featured,
}: HomePageProps) {
    const page = usePage();
    const user = (page.props.auth as { user?: User | null } | undefined)?.user;
    const company = page.props.company as CompanyContext | null | undefined;

    const approvalStatus = company?.approval_status;
    const isApprovedCompany = Boolean(user && approvalStatus === 'approved');
    const isPendingOrUnapprovedCompany = Boolean(
        user && approvalStatus !== 'approved',
    );

    return (
        <>
            <Head title="Atacado B2B de Mercearia, Bebidas, Limpeza, Higiene e Frios" />

            <div className="flex flex-col gap-10 sm:gap-12 lg:gap-14">
                {/* 2.1 Hero / Vitrine principal: coluna única mobile-first, largura limitada em ultrawide, 1 CTA primário */}
                <section
                    aria-labelledby="home-hero-heading"
                    className="rounded-lg border border-border bg-card px-5 py-7 text-card-foreground sm:px-8 sm:py-10 lg:px-10 lg:py-12"
                >
                    <div className="flex max-w-3xl flex-col gap-5">
                        <h1
                            id="home-hero-heading"
                            className="font-semibold tracking-tight text-foreground"
                        >
                            {isApprovedCompany
                                ? 'Abastecimento atacadista com preços de tabela liberados para sua operação'
                                : 'Abastecimento B2B de mercearia, bebidas, limpeza, higiene e frios para o seu negócio'}
                        </h1>

                        {isApprovedCompany && (
                            <p className="max-w-2xl text-fluid-base leading-relaxed text-muted-foreground">
                                Consulte as ofertas vigentes para{' '}
                                <span className="font-medium text-foreground">
                                    {company?.name ?? 'sua empresa'}
                                </span>
                                , compare faixas de desconto por quantidade e
                                programe a reposição de giro do seu estoque com
                                disponibilidade imediata.
                            </p>
                        )}

                        {isPendingOrUnapprovedCompany && (
                            <div className="flex flex-col gap-2">
                                <p
                                    role="status"
                                    className="text-sm font-semibold text-warning-muted-foreground"
                                >
                                    Cadastro em análise: preços liberados após
                                    aprovação
                                </p>
                                <p className="max-w-2xl text-fluid-base leading-relaxed text-muted-foreground">
                                    {approvalStatus === 'rejected'
                                        ? `O cadastro de ${company?.name ?? 'sua empresa'} requer revisão cadastral. Enquanto isso, navegue pelo mix de mercearia, bebidas, limpeza, higiene e frios.`
                                        : `Estamos validando os dados comerciais de ${company?.name ?? 'sua empresa'}. Você já pode consultar o catálogo completo e conferir os itens em campanha.`}
                                </p>
                            </div>
                        )}

                        {!user && (
                            <p className="max-w-2xl text-fluid-base leading-relaxed text-muted-foreground">
                                Reposição corporativa para mercados, padarias,
                                restaurantes, hotéis e revendas. Cadastre o CNPJ
                                da sua empresa ou acesse sua conta para liberar
                                preços nas tabelas Padrão e Atacadista.
                            </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 pt-1">
                            {/* Única ação primária da tela */}
                            <StoreButton variant="brand" size="lg" asChild>
                                <a href="#ofertas">
                                    <span>Ver ofertas</span>
                                    <ArrowDownRight
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </a>
                            </StoreButton>

                            {!user && (
                                <>
                                    <StoreButton
                                        variant="outline"
                                        size="lg"
                                        asChild
                                    >
                                        <Link href={login()}>
                                            Entrar na conta B2B
                                        </Link>
                                    </StoreButton>
                                    <Link
                                        href={register()}
                                        className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                    >
                                        Cadastrar empresa
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </section>

                {/* Atalhos das 5 categorias */}
                <CategoryShortcutsSection categories={categories} />

                {/* 2.2 Seções de vitrine com props adiadas (Inertia::defer) */}
                <DeferredShowcaseSection
                    id="ofertas"
                    dataKey="promotions"
                    title="Em promoção"
                    subtitle="Produtos com desconto promocional vigente na tabela comercial"
                    items={promotions}
                />

                <DeferredShowcaseSection
                    id="mais-vendidos"
                    dataKey="bestSellers"
                    title="Mais vendidos"
                    subtitle="Itens de maior giro nos pedidos corporativos entregues"
                    items={bestSellers}
                />

                <DeferredShowcaseSection
                    id="destaques"
                    dataKey="featured"
                    title="Destaques"
                    subtitle="Seleção de produtos ativos com pronta entrega em estoque"
                    items={featured}
                />
            </div>
        </>
    );
}
