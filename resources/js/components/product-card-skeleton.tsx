import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type ProductCardSkeletonProps = {
    showAction?: boolean;
    className?: string;
};

/**
 * Skeleton com a mesma proporção e geometria do ProductCard para evitar CLS.
 */
export function ProductCardSkeleton({
    showAction = false,
    className,
}: ProductCardSkeletonProps) {
    return (
        <div
            role="status"
            aria-label="Carregando produto"
            className={cn(
                'flex h-full flex-col rounded-lg border border-border bg-card',
                className,
            )}
        >
            <Skeleton className="aspect-square w-full rounded-t-lg rounded-b-none" />
            <div className="flex flex-1 flex-col justify-between gap-3 p-3.5 sm:p-4">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                        <Skeleton className="h-3.5 w-20" />
                        <Skeleton className="h-3.5 w-14" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>

                <div className="mt-auto flex flex-col gap-2.5 border-t border-border/70 pt-3">
                    <Skeleton className="h-6 w-28" />
                    <Skeleton className="h-5 w-40" />
                    {showAction && <Skeleton className="h-11 w-full" />}
                </div>
            </div>
        </div>
    );
}

export type ProductGridSkeletonProps = {
    count?: number;
    showAction?: boolean;
    className?: string;
};

/**
 * Grade responsiva de skeletons acompanhando os breakpoints mobile-first até 3xl.
 */
export function ProductGridSkeleton({
    count = 8,
    showAction = false,
    className,
}: ProductGridSkeletonProps) {
    return (
        <div
            aria-busy="true"
            aria-live="polite"
            className={cn(PRODUCT_GRID_CLASSES, className)}
        >
            {Array.from({ length: count }, (_, index) => (
                <ProductCardSkeleton key={index} showAction={showAction} />
            ))}
        </div>
    );
}

export default ProductCardSkeleton;

/**
 * Grade de produtos que se adapta à largura disponível (com ou sem barra lateral): cada card
 * tem no mínimo 14,5 rem, então nenhuma largura de tela espreme o conteúdo do card.
 */
export const PRODUCT_GRID_CLASSES =
    'grid grid-cols-[repeat(auto-fill,minmax(min(100%,14.5rem),1fr))] gap-4';
