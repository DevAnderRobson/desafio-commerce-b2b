import { Link } from '@inertiajs/react';
import { ArrowLeft, Check, ShieldCheck } from 'lucide-react';
import { createContext, useContext } from 'react';
import AppLogo from '@/components/app-logo';
import { StoreButton } from '@/components/button';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import type { CheckoutLayoutProps, CheckoutStep } from '@/types';

const CheckoutLayoutContext = createContext(false);

export const defaultCheckoutSteps: CheckoutStep[] = [
    { id: 'cart', label: 'Carrinho', href: '/carrinho' },
    { id: 'shipping', label: 'Entrega', href: '/checkout/entrega' },
    { id: 'payment', label: 'Pagamento', href: '/checkout/pagamento' },
    { id: 'processing', label: 'Processando' },
    { id: 'confirmation', label: 'Confirmação' },
];

/**
 * Layout enxuto para o funil de checkout B2B.
 * Reduz distrações mantendo apenas logo, indicador de etapas do funil e ação de retorno ao carrinho.
 */
export function CheckoutLayout({
    children,
    currentStep = 'shipping',
    steps = defaultCheckoutSteps,
    backHref = '/carrinho',
    backLabel = 'Voltar ao carrinho',
    headerActionsSlot,
    summarySlot,
    mobileBottomBar,
    containerClassName,
}: CheckoutLayoutProps) {
    const isInsideCheckoutLayout = useContext(CheckoutLayoutContext);
    const activeIndex = Math.max(
        0,
        steps.findIndex((step) => step.id === currentStep),
    );
    const activeStep = steps[activeIndex] ?? steps[0];

    if (isInsideCheckoutLayout) {
        return <>{children}</>;
    }

    return (
        <CheckoutLayoutContext.Provider value={true}>
            <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
                <a
                    href="#checkout-main-content"
                    className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg focus:ring-2 focus:ring-ring focus:outline-none"
                >
                    Pular para o conteúdo do checkout
                </a>

                <header className="sticky top-0 z-40 border-b border-border bg-background/95 pt-safe backdrop-blur-xs">
                    <div className="store-container flex min-h-16 items-center justify-between gap-3 py-2">
                        <Link
                            href={home()}
                            className="inline-flex min-h-11 items-center gap-2 rounded-md px-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                            <AppLogo />
                        </Link>

                        {/* Indicador de etapas completo para desktop (lg+) */}
                        <nav
                            aria-label="Etapas da compra"
                            className="hidden lg:block"
                        >
                            <ol className="flex items-center gap-2 xl:gap-3">
                                {steps.map((step, index) => {
                                    const isCompleted = index < activeIndex;
                                    const isCurrent = index === activeIndex;

                                    const stepContent = (
                                        <span
                                            className={cn(
                                                'inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150 ease-out',
                                                isCurrent &&
                                                    'font-semibold text-foreground',
                                                isCompleted &&
                                                    'font-medium text-foreground/85 hover:text-foreground',
                                                !isCompleted &&
                                                    !isCurrent &&
                                                    'text-muted-foreground',
                                            )}
                                        >
                                            <span
                                                aria-hidden="true"
                                                className={cn(
                                                    'inline-flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums',
                                                    isCurrent &&
                                                        'border-brand bg-brand text-brand-foreground',
                                                    isCompleted &&
                                                        'border-success bg-success text-success-foreground',
                                                    !isCompleted &&
                                                        !isCurrent &&
                                                        'border-border bg-muted text-muted-foreground',
                                                )}
                                            >
                                                {isCompleted ? (
                                                    <Check className="size-3.5 stroke-[2.5]" />
                                                ) : (
                                                    index + 1
                                                )}
                                            </span>
                                            <span>{step.label}</span>
                                        </span>
                                    );

                                    return (
                                        <li
                                            key={step.id}
                                            aria-current={
                                                isCurrent ? 'step' : undefined
                                            }
                                            className="flex items-center gap-2 xl:gap-3"
                                        >
                                            {isCompleted && step.href ? (
                                                <Link
                                                    href={step.href}
                                                    className="inline-flex min-h-11 items-center rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                                >
                                                    {stepContent}
                                                </Link>
                                            ) : (
                                                stepContent
                                            )}

                                            {index < steps.length - 1 && (
                                                <span
                                                    aria-hidden="true"
                                                    className={cn(
                                                        'h-px w-5 xl:w-8',
                                                        isCompleted
                                                            ? 'bg-success'
                                                            : 'bg-border',
                                                    )}
                                                />
                                            )}
                                        </li>
                                    );
                                })}
                            </ol>
                        </nav>

                        <div className="flex items-center gap-2">
                            {headerActionsSlot}

                            <StoreButton
                                variant="ghost"
                                size="touch"
                                asChild
                                className="px-2.5 sm:px-3"
                            >
                                <Link href={backHref}>
                                    <ArrowLeft
                                        className="size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span className="text-sm font-medium">
                                        {backLabel}
                                    </span>
                                </Link>
                            </StoreButton>
                        </div>
                    </div>

                    {/* Indicador compacto de etapas para mobile e tablet (< lg) */}
                    <div
                        aria-label="Progresso da compra"
                        className="border-t border-border/70 bg-muted/30 px-4 py-2.5 lg:hidden"
                    >
                        <div className="mx-auto flex max-w-3xl flex-col gap-2">
                            <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="font-semibold text-foreground">
                                    Etapa {activeIndex + 1} de {steps.length}:{' '}
                                    {activeStep?.label}
                                </span>
                                <span className="text-muted-foreground tabular-nums">
                                    {Math.round(
                                        ((activeIndex + 1) / steps.length) *
                                            100,
                                    )}
                                    %
                                </span>
                            </div>

                            <ol
                                aria-label="Etapas do funil"
                                className="grid grid-cols-5 gap-1.5"
                            >
                                {steps.map((step, index) => {
                                    const isCompleted = index < activeIndex;
                                    const isCurrent = index === activeIndex;

                                    return (
                                        <li
                                            key={step.id}
                                            aria-current={
                                                isCurrent ? 'step' : undefined
                                            }
                                            className="flex flex-col gap-1"
                                        >
                                            <span
                                                aria-hidden="true"
                                                className={cn(
                                                    'h-1.5 w-full rounded-full transition-colors duration-150 ease-out',
                                                    isCurrent && 'bg-brand',
                                                    isCompleted && 'bg-success',
                                                    !isCompleted &&
                                                        !isCurrent &&
                                                        'bg-border',
                                                )}
                                            />
                                            <span
                                                className={cn(
                                                    'truncate text-[11px] leading-tight',
                                                    isCurrent
                                                        ? 'font-semibold text-foreground'
                                                        : 'text-muted-foreground',
                                                )}
                                            >
                                                {step.shortLabel ?? step.label}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>
                    </div>
                </header>

                <main
                    id="checkout-main-content"
                    tabIndex={-1}
                    className={cn(
                        'store-container flex-1 py-6 outline-none sm:py-8 lg:py-10',
                        containerClassName,
                    )}
                >
                    {summarySlot ? (
                        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
                            <div className="lg:col-span-7 xl:col-span-8">
                                {children}
                            </div>
                            <aside
                                aria-label="Resumo do pedido"
                                className="w-full lg:sticky lg:top-24 lg:col-span-5 xl:col-span-4"
                            >
                                {summarySlot}
                            </aside>
                        </div>
                    ) : (
                        children
                    )}
                </main>

                <footer className="mt-auto border-t border-border bg-card py-4 text-xs text-muted-foreground">
                    <div className="store-container flex flex-col items-center justify-between gap-2 sm:flex-row">
                        <p className="inline-flex items-center gap-1.5 font-medium text-foreground">
                            <ShieldCheck
                                className="size-4 text-success"
                                aria-hidden="true"
                            />
                            <span>
                                Ambiente B2B seguro — preços e limite de crédito
                                validados no servidor
                            </span>
                        </p>
                        <p>Dados preservados ao retornar entre etapas</p>
                    </div>
                </footer>

                {mobileBottomBar && (
                    <div className="sticky bottom-0 z-40 border-t border-border bg-background/95 pt-2.5 px-safe pb-safe backdrop-blur-xs lg:hidden">
                        {mobileBottomBar}
                    </div>
                )}
            </div>
        </CheckoutLayoutContext.Provider>
    );
}

export default CheckoutLayout;
