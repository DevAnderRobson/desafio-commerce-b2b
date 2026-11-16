import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
    useCallback,
    useEffect,
    useId,
    useRef,
    useState,
    type KeyboardEvent,
    type ReactNode,
} from 'react';
import { StoreButton } from '@/components/button';
import { type ProductCardProps } from '@/components/product-card';
import { QuickAddProductCard } from '@/components/quick-add-product-card';
import { cn } from '@/lib/utils';

export type ProductCarouselItem = ProductCardProps;

export type ProductCarouselProps = {
    id?: string;
    title: string;
    subtitle?: string;
    ariaLabel?: string;
    items: ProductCarouselItem[];
    headingLevel?: 'h2' | 'h3';
    cardHeadingLevel?: 'h2' | 'h3';
    headerActionSlot?: ReactNode;
    className?: string;
};

const CAROUSEL_ITEM_WIDTH_CLASSES =
    'w-[68%] shrink-0 snap-start min-[480px]:w-[58%] sm:w-[calc((100%-1rem)/2.25)] md:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)] 2xl:w-[calc((100%-4rem)/5)] 3xl:w-[calc((100%-5rem)/6)]';

function prefersReducedMotion(): boolean {
    if (
        typeof window === 'undefined' ||
        typeof window.matchMedia !== 'function'
    ) {
        return false;
    }

    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Carrossel acessível e reutilizável de produtos B2B:
 * - Scroll-snap horizontal com swipe nativo no touch e sem autoplay
 * - Botões Anterior/Próximo com alvo >= 44x44px e aria-label em pt-BR (ocultos em touch)
 * - Navegação por teclado (ArrowLeft, ArrowRight, Home, End)
 * - Quantidade responsiva de itens: ~1,5 celular (360px), 2-3 tablet (768px), 4 desktop (1280px), 5 full HD (1920px), 6 ultrawide (2560px+)
 */
export function ProductCarousel({
    id,
    title,
    subtitle,
    ariaLabel,
    items,
    headingLevel = 'h2',
    cardHeadingLevel = 'h3',
    headerActionSlot,
    className,
}: ProductCarouselProps) {
    const generatedId = useId();
    const headingId = `${id ?? `carousel-${generatedId}`}-heading`;
    const trackId = `${id ?? `carousel-${generatedId}`}-track`;
    const trackRef = useRef<HTMLUListElement | null>(null);
    const [canScrollPrev, setCanScrollPrev] = useState(false);
    const [canScrollNext, setCanScrollNext] = useState(false);

    const HeadingTag = headingLevel;

    const updateScrollState = useCallback(() => {
        const element = trackRef.current;

        if (!element) {
            return;
        }

        const maxScrollLeft = element.scrollWidth - element.clientWidth;
        const tolerance = 2;

        setCanScrollPrev(element.scrollLeft > tolerance);
        setCanScrollNext(element.scrollLeft < maxScrollLeft - tolerance);
    }, []);

    useEffect(() => {
        const element = trackRef.current;

        if (!element) {
            return;
        }

        updateScrollState();

        const handleScroll = () => updateScrollState();
        element.addEventListener('scroll', handleScroll, { passive: true });

        let resizeObserver: ResizeObserver | null = null;

        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(() => {
                updateScrollState();
            });
            resizeObserver.observe(element);
        } else {
            window.addEventListener('resize', handleScroll);
        }

        return () => {
            element.removeEventListener('scroll', handleScroll);

            if (resizeObserver) {
                resizeObserver.disconnect();
            } else {
                window.removeEventListener('resize', handleScroll);
            }
        };
    }, [items.length, updateScrollState]);

    const scrollByStep = useCallback((direction: 'prev' | 'next') => {
        const element = trackRef.current;

        if (!element) {
            return;
        }

        const step = Math.max(element.clientWidth * 0.8, 260);
        const delta = direction === 'next' ? step : -step;

        element.scrollBy({
            left: delta,
            behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        });
    }, []);

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLElement>) => {
            const element = trackRef.current;

            if (!element) {
                return;
            }

            if (event.key === 'ArrowRight') {
                event.preventDefault();
                scrollByStep('next');
            } else if (event.key === 'ArrowLeft') {
                event.preventDefault();
                scrollByStep('prev');
            } else if (event.key === 'Home') {
                event.preventDefault();
                element.scrollTo({
                    left: 0,
                    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
                });
            } else if (event.key === 'End') {
                event.preventDefault();
                element.scrollTo({
                    left: element.scrollWidth,
                    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
                });
            }
        },
        [scrollByStep],
    );

    if (items.length === 0) {
        return null;
    }

    const hasOverflow = canScrollPrev || canScrollNext;

    return (
        <section
            id={id}
            role="region"
            aria-roledescription="carrossel"
            aria-label={ariaLabel}
            aria-labelledby={ariaLabel ? undefined : headingId}
            onKeyDown={handleKeyDown}
            className={cn(
                'flex scroll-mt-20 flex-col gap-4 sm:gap-5',
                className,
            )}
        >
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <HeadingTag
                        id={headingId}
                        className="text-fluid-xl font-semibold text-foreground"
                    >
                        {title}
                    </HeadingTag>
                    {subtitle && (
                        <p className="text-sm text-muted-foreground">
                            {subtitle}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {headerActionSlot}

                    {hasOverflow && (
                        <div
                            role="group"
                            aria-label={`Controles do carrossel ${title}`}
                            className="hidden items-center gap-1.5 sm:flex"
                        >
                            <StoreButton
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-controls={trackId}
                                aria-label={`Produtos anteriores em ${title}`}
                                disabled={!canScrollPrev}
                                onClick={() => scrollByStep('prev')}
                            >
                                <ChevronLeft
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </StoreButton>
                            <StoreButton
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-controls={trackId}
                                aria-label={`Próximos produtos em ${title}`}
                                disabled={!canScrollNext}
                                onClick={() => scrollByStep('next')}
                            >
                                <ChevronRight
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </StoreButton>
                        </div>
                    )}
                </div>
            </div>

            <ul
                id={trackId}
                ref={trackRef}
                tabIndex={0}
                aria-label={`Lista de produtos: ${title}`}
                className="flex snap-x snap-mandatory [scrollbar-width:none] gap-4 overflow-x-auto scroll-smooth rounded-lg pb-2 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:scroll-auto [&::-webkit-scrollbar]:hidden"
            >
                {items.map((item) => (
                    <li key={item.id} className={CAROUSEL_ITEM_WIDTH_CLASSES}>
                        <QuickAddProductCard
                            {...item}
                            headingLevel={cardHeadingLevel}
                        />
                    </li>
                ))}
            </ul>
        </section>
    );
}

export default ProductCarousel;
