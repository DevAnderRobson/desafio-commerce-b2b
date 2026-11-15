import { Link, router } from '@inertiajs/react';
import { Heart } from 'lucide-react';
import { useCallback, useState } from 'react';
import { StoreButton } from '@/components/button';
import { storeToast } from '@/components/toast';
import { cn } from '@/lib/utils';

export type WishlistButtonProps = {
    productId: number | string;
    wishlisted: boolean;
    isGuest: boolean;
    loginHref: string;
    addHref: string;
    removeHref: string;
    productName?: string;
    /** Modo compacto apenas com ícone (>= 44x44px) para uso no `headerActionSlot` do ProductCard. */
    iconOnly?: boolean;
    className?: string;
};

type OptimisticState = {
    baseProp: boolean;
    value: boolean;
} | null;

/**
 * Botão de favoritar/desfavoritar na lista de desejos do usuário (item 4.4):
 * - Alvo mínimo de 44x44px (`size="touch"` ou `size="icon"`), `aria-pressed` e rótulo acessível.
 * - Atualização otimista local imediata com rollback automático em caso de falha na requisição.
 * - Sem login (`isGuest`): direciona para a página de login preservando o fluxo de retorno.
 * - Exportável para uso tanto na página de detalhe quanto no `headerActionSlot` do `ProductCard`.
 */
export function WishlistButton({
    productId,
    wishlisted,
    isGuest,
    loginHref,
    addHref,
    removeHref,
    productName,
    iconOnly = false,
    className,
}: WishlistButtonProps) {
    const [optimistic, setOptimistic] = useState<OptimisticState>(null);
    const [isPending, setIsPending] = useState(false);
    const [liveAnnouncement, setLiveAnnouncement] = useState('');

    const isWishlisted =
        optimistic !== null && optimistic.baseProp === wishlisted
            ? optimistic.value
            : wishlisted;

    const itemLabel = productName ? ` ${productName}` : ' este produto';

    const handleToggle = useCallback(() => {
        if (isPending) {
            return;
        }

        const nextValue = !isWishlisted;

        setOptimistic({
            baseProp: wishlisted,
            value: nextValue,
        });
        setIsPending(true);
        setLiveAnnouncement(
            nextValue
                ? `Adicionado${itemLabel} à lista de desejos.`
                : `Removido${itemLabel} da lista de desejos.`,
        );

        const rollback = () => {
            setOptimistic(null);
            setLiveAnnouncement(
                'Não foi possível atualizar sua lista de desejos.',
            );
            storeToast.error(
                'Não foi possível atualizar a lista de desejos. Tente novamente.',
            );
        };

        if (nextValue) {
            router.post(
                addHref,
                { product_id: productId },
                {
                    preserveScroll: true,
                    preserveState: true,
                    onError: rollback,
                    onFinish: () => {
                        setIsPending(false);
                    },
                },
            );
            return;
        }

        router.delete(removeHref, {
            preserveScroll: true,
            preserveState: true,
            onError: rollback,
            onFinish: () => {
                setIsPending(false);
            },
        });
    }, [
        addHref,
        isPending,
        isWishlisted,
        itemLabel,
        productId,
        removeHref,
        wishlisted,
    ]);

    if (isGuest) {
        return (
            <StoreButton
                variant="outline"
                size={iconOnly ? 'icon' : 'touch'}
                asChild
                className={cn(
                    iconOnly &&
                        'rounded-full bg-background/90 backdrop-blur-xs',
                    className,
                )}
            >
                <Link
                    href={loginHref}
                    aria-label={`Entre na sua conta para salvar${itemLabel} na lista de desejos`}
                >
                    <Heart className="size-4 shrink-0" aria-hidden="true" />
                    {!iconOnly && <span>Favoritar</span>}
                </Link>
            </StoreButton>
        );
    }

    return (
        <>
            <StoreButton
                type="button"
                variant="outline"
                size={iconOnly ? 'icon' : 'touch'}
                aria-pressed={isWishlisted}
                aria-label={
                    isWishlisted
                        ? `Remover${itemLabel} da lista de desejos`
                        : `Adicionar${itemLabel} à lista de desejos`
                }
                onClick={handleToggle}
                className={cn(
                    iconOnly &&
                        'rounded-full bg-background/90 backdrop-blur-xs',
                    isWishlisted &&
                        'border-brand/40 bg-brand-muted/50 text-foreground hover:bg-brand-muted',
                    className,
                )}
            >
                <Heart
                    className={cn(
                        'size-4 shrink-0 transition-transform duration-150 ease-out motion-reduce:transition-none',
                        isWishlisted
                            ? 'scale-110 fill-brand text-brand'
                            : 'text-foreground',
                    )}
                    aria-hidden="true"
                />
                {!iconOnly && (
                    <span>
                        {isWishlisted ? 'Salvo nos favoritos' : 'Favoritar'}
                    </span>
                )}
            </StoreButton>

            <span
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
            >
                {liveAnnouncement}
            </span>
        </>
    );
}

export default WishlistButton;
