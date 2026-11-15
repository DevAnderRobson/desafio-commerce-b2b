import { Link } from '@inertiajs/react';
import {
    AlertCircle,
    Calendar,
    Check,
    CheckCircle2,
    Clock,
    Lock,
    Minus,
    Plus,
    ShoppingCart,
    XCircle,
} from 'lucide-react';
import {
    useCallback,
    useEffect,
    useId,
    useRef,
    useState,
    type ChangeEvent,
    type KeyboardEvent,
} from 'react';
import { StoreButton } from '@/components/button';
import InputError from '@/components/input-error';
import { PriceBadge } from '@/components/price-badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCentsToBRL, formatInteger } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ProductAvailability } from '@/types/product';
import type { ProductPriceState } from '@/types/store';

export type ProductBuyBoxProps = {
    priceState: ProductPriceState;
    availability: ProductAvailability;
    promotionEndsAt: string | null;
    canPurchase: boolean;
    loginHref?: string;
    onAddToCart: (quantity: number) => Promise<void>;
    className?: string;
};

type CartSubmissionState = 'idle' | 'loading' | 'added' | 'error';

function formatPromotionEndDate(isoString: string | null): string | null {
    if (!isoString) {
        return null;
    }

    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(isoString)
        ? `${isoString}T12:00:00`
        : isoString;
    const parsed = new Date(normalized);

    if (Number.isNaN(parsed.getTime())) {
        return isoString;
    }

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(parsed);
}

/**
 * Caixa comercial B2B de preço, disponibilidade, seletor de quantidade com preço
 * dinâmico de atacado e botão "Adicionar ao carrinho" + barra fixa mobile (item 4.2 e 4.6).
 * - Sem cards aninhados; hierarquia clara com único CTA primário (`variant="brand"`).
 * - Nunca recalcula regras de negócio de promoção sobre atacado: usa estritamente
 *   `unitPriceCents` e `wholesalePriceCents` enviados pelo backend; total = qtd × preço unitário exibido.
 */
export function ProductBuyBox({
    priceState,
    availability,
    promotionEndsAt,
    canPurchase,
    loginHref,
    onAddToCart,
    className,
}: ProductBuyBoxProps) {
    const quantityInputId = useId();
    const quantityErrorId = `${quantityInputId}-error`;
    const maxStock = Math.max(availability.quantity, 0);

    const [rawQuantity, setRawQuantity] = useState('1');
    const [quantity, setQuantity] = useState(1);
    const [quantityError, setQuantityError] = useState<string | null>(null);
    const [cartState, setCartState] = useState<CartSubmissionState>('idle');
    const [cartErrorMessage, setCartErrorMessage] = useState<string | null>(
        null,
    );
    const addedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (addedTimerRef.current !== null) {
                clearTimeout(addedTimerRef.current);
            }
        };
    }, []);

    const isOutOfStock =
        availability.status === 'out_of_stock' || maxStock <= 0;
    const isLowStock = availability.status === 'low_stock' && !isOutOfStock;

    const validateAndApplyQuantity = useCallback(
        (nextNumeric: number, nextRaw?: string) => {
            const upperLimit = Math.max(maxStock, 1);

            if (!Number.isFinite(nextNumeric) || nextNumeric < 1) {
                setQuantity(1);
                setRawQuantity(nextRaw ?? '1');
                setQuantityError(
                    'A quantidade mínima para compra é 1 unidade.',
                );
                return;
            }

            if (maxStock > 0 && nextNumeric > maxStock) {
                setQuantity(maxStock);
                setRawQuantity(nextRaw ?? String(maxStock));
                setQuantityError(
                    `Quantidade máxima disponível em estoque: ${formatInteger(maxStock)} un.`,
                );
                return;
            }

            const clamped = Math.min(
                Math.max(Math.trunc(nextNumeric), 1),
                upperLimit,
            );
            setQuantity(clamped);
            setRawQuantity(nextRaw ?? String(clamped));
            setQuantityError(null);
        },
        [maxStock],
    );

    const handleStepQuantity = useCallback(
        (delta: number) => {
            const nextValue = quantity + delta;
            validateAndApplyQuantity(nextValue, String(nextValue));
        },
        [quantity, validateAndApplyQuantity],
    );

    const handleQuantityInputChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const value = event.target.value;
            setRawQuantity(value);

            if (value.trim() === '') {
                setQuantityError(
                    'Informe uma quantidade entre 1 e o estoque disponível.',
                );
                return;
            }

            const parsed = Number.parseInt(value, 10);
            validateAndApplyQuantity(parsed, value);
        },
        [validateAndApplyQuantity],
    );

    const handleQuantityBlur = useCallback(() => {
        if (rawQuantity.trim() === '') {
            setQuantity(1);
            setRawQuantity('1');
            setQuantityError(null);
            return;
        }

        const parsed = Number.parseInt(rawQuantity, 10);
        if (!Number.isFinite(parsed) || parsed < 1) {
            setQuantity(1);
            setRawQuantity('1');
            setQuantityError(null);
            return;
        }

        if (maxStock > 0 && parsed > maxStock) {
            setQuantity(maxStock);
            setRawQuantity(String(maxStock));
            setQuantityError(
                `Quantidade ajustada para o limite em estoque (${formatInteger(maxStock)} un.).`,
            );
            return;
        }

        setQuantity(parsed);
        setRawQuantity(String(parsed));
        setQuantityError(null);
    }, [maxStock, rawQuantity]);

    const handleQuantityKeyDown = useCallback(
        (event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                handleStepQuantity(1);
            } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                handleStepQuantity(-1);
            }
        },
        [handleStepQuantity],
    );

    const hasWholesaleTier =
        priceState.status === 'available' &&
        typeof priceState.wholesalePriceCents === 'number' &&
        typeof priceState.wholesaleMinQuantity === 'number' &&
        priceState.wholesaleMinQuantity > 0;

    const isWholesaleApplied =
        priceState.status === 'available' &&
        hasWholesaleTier &&
        quantity >= (priceState.wholesaleMinQuantity ?? 0);

    const activeUnitPriceCents =
        priceState.status === 'available'
            ? isWholesaleApplied &&
              typeof priceState.wholesalePriceCents === 'number'
                ? priceState.wholesalePriceCents
                : priceState.unitPriceCents
            : 0;

    const lineTotalCents = quantity * activeUnitPriceCents;
    const formattedPromotionEnd = formatPromotionEndDate(promotionEndsAt);

    const canSubmitPurchase =
        priceState.status === 'available' &&
        canPurchase &&
        !isOutOfStock &&
        quantity >= 1 &&
        quantity <= maxStock &&
        rawQuantity.trim() !== '';

    const handleAddToCart = useCallback(async () => {
        if (!canSubmitPurchase || cartState === 'loading') {
            return;
        }

        setCartState('loading');
        setCartErrorMessage(null);

        try {
            await onAddToCart(quantity);
            setCartState('added');

            if (addedTimerRef.current !== null) {
                clearTimeout(addedTimerRef.current);
            }

            addedTimerRef.current = setTimeout(() => {
                setCartState('idle');
            }, 2500);
        } catch (error) {
            setCartState('error');
            setCartErrorMessage(
                error instanceof Error && error.message
                    ? error.message
                    : 'Não foi possível adicionar ao carrinho. Verifique a quantidade em estoque e tente novamente.',
            );
        }
    }, [canSubmitPurchase, cartState, onAddToCart, quantity]);

    const resolvedLoginHref =
        (priceState.status === 'guest' ? priceState.loginHref : undefined) ??
        loginHref ??
        '/login';

    return (
        <>
            <div
                className={cn(
                    'flex flex-col gap-5 border-t border-b border-border py-5',
                    className,
                )}
            >
                {/* Indicador semântico de disponibilidade em estoque (texto + ícone, nunca só cor) */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    {isOutOfStock ? (
                        <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-destructive">
                            <XCircle
                                className="size-4 shrink-0"
                                aria-hidden="true"
                            />
                            <span>Indisponível em estoque</span>
                        </div>
                    ) : isLowStock ? (
                        <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-warning-muted-foreground">
                            <Clock
                                className="size-4 shrink-0"
                                aria-hidden="true"
                            />
                            <span>
                                Poucas unidades ({formatInteger(maxStock)} un.
                                disponíveis)
                            </span>
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-success-muted-foreground">
                            <CheckCircle2
                                className="size-4 shrink-0"
                                aria-hidden="true"
                            />
                            <span>
                                Em estoque ({formatInteger(maxStock)} un. pronta
                                entrega)
                            </span>
                        </div>
                    )}
                </div>

                {/* Estado 1: Preço disponível para cliente B2B aprovado */}
                {priceState.status === 'available' && (
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                                {typeof priceState.originalPriceCents ===
                                    'number' &&
                                    priceState.originalPriceCents >
                                        priceState.unitPriceCents && (
                                        <span className="text-sm text-muted-foreground tabular-nums line-through">
                                            De{' '}
                                            {formatCentsToBRL(
                                                priceState.originalPriceCents,
                                            )}
                                        </span>
                                    )}

                                {typeof priceState.discountPercent ===
                                    'number' &&
                                    priceState.discountPercent > 0 && (
                                        <PriceBadge
                                            variant="promo"
                                            discountPercent={
                                                priceState.discountPercent
                                            }
                                        />
                                    )}

                                {formattedPromotionEnd && (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                        <Calendar
                                            className="size-3.5 shrink-0"
                                            aria-hidden="true"
                                        />
                                        <span>
                                            Promoção até {formattedPromotionEnd}
                                        </span>
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-wrap items-baseline gap-2">
                                <span
                                    aria-live="polite"
                                    className="text-fluid-2xl leading-none font-bold tracking-tight text-foreground tabular-nums"
                                >
                                    {formatCentsToBRL(activeUnitPriceCents)}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    / un.
                                </span>

                                {isWholesaleApplied && (
                                    <span className="inline-flex items-center gap-1 rounded-sm border border-success/30 bg-success-muted px-2 py-0.5 text-xs font-semibold text-success-muted-foreground">
                                        <Check
                                            className="size-3.5 shrink-0"
                                            aria-hidden="true"
                                        />
                                        <span>Preço de atacado aplicado</span>
                                    </span>
                                )}
                            </div>

                            {/* Condição de atacado ("A partir de N un.") */}
                            {hasWholesaleTier &&
                                typeof priceState.wholesaleMinQuantity ===
                                    'number' &&
                                typeof priceState.wholesalePriceCents ===
                                    'number' && (
                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                        <PriceBadge
                                            variant="wholesale"
                                            wholesaleMinQuantity={
                                                priceState.wholesaleMinQuantity
                                            }
                                            wholesalePriceCents={
                                                priceState.wholesalePriceCents
                                            }
                                        />

                                        {!isWholesaleApplied && (
                                            <span className="text-xs text-muted-foreground">
                                                Faltam{' '}
                                                <strong className="font-semibold text-foreground tabular-nums">
                                                    {formatInteger(
                                                        priceState.wholesaleMinQuantity -
                                                            quantity,
                                                    )}{' '}
                                                    un.
                                                </strong>{' '}
                                                para ativar o valor de atacado
                                            </span>
                                        )}
                                    </div>
                                )}
                        </div>

                        {/* Seletor de quantidade + Resumo dinâmico do total da linha */}
                        {!isOutOfStock && (
                            <div className="flex flex-col gap-3 pt-1">
                                <div className="flex flex-wrap items-end justify-between gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <Label
                                            htmlFor={quantityInputId}
                                            className="text-sm font-medium text-foreground"
                                        >
                                            Quantidade (un.)
                                        </Label>

                                        <div className="inline-flex items-center gap-1.5">
                                            <StoreButton
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                disabled={quantity <= 1}
                                                onClick={() =>
                                                    handleStepQuantity(-1)
                                                }
                                                aria-label="Diminuir quantidade"
                                            >
                                                <Minus
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                            </StoreButton>

                                            <Input
                                                id={quantityInputId}
                                                type="number"
                                                inputMode="numeric"
                                                min={1}
                                                max={maxStock}
                                                step={1}
                                                value={rawQuantity}
                                                onChange={
                                                    handleQuantityInputChange
                                                }
                                                onBlur={handleQuantityBlur}
                                                onKeyDown={
                                                    handleQuantityKeyDown
                                                }
                                                aria-invalid={
                                                    Boolean(quantityError) ||
                                                    undefined
                                                }
                                                aria-describedby={
                                                    quantityError
                                                        ? quantityErrorId
                                                        : undefined
                                                }
                                                className="min-h-11 w-24 [appearance:textfield] text-center font-semibold tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                            />

                                            <StoreButton
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                disabled={quantity >= maxStock}
                                                onClick={() =>
                                                    handleStepQuantity(1)
                                                }
                                                aria-label="Aumentar quantidade"
                                            >
                                                <Plus
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                            </StoreButton>
                                        </div>
                                    </div>

                                    {/* Total da linha atualizado em tempo real (qtd × preço unitário exibido) */}
                                    <div
                                        aria-live="polite"
                                        aria-atomic="true"
                                        className="flex flex-col items-start sm:items-end"
                                    >
                                        <span className="text-xs font-medium text-muted-foreground">
                                            Subtotal ({formatInteger(quantity)}{' '}
                                            {quantity === 1
                                                ? 'unidade'
                                                : 'unidades'}
                                            )
                                        </span>
                                        <span className="text-fluid-xl font-bold tracking-tight text-foreground tabular-nums">
                                            {formatCentsToBRL(lineTotalCents)}
                                        </span>
                                    </div>
                                </div>

                                <InputError
                                    id={quantityErrorId}
                                    message={quantityError ?? undefined}
                                />
                            </div>
                        )}

                        {/* Ação primária única: Adicionar ao carrinho */}
                        <div className="flex flex-col gap-2 pt-1">
                            <StoreButton
                                type="button"
                                variant={isOutOfStock ? 'outline' : 'brand'}
                                size="lg"
                                disabled={!canSubmitPurchase}
                                loading={cartState === 'loading'}
                                loadingText="Adicionando ao carrinho..."
                                onClick={() => void handleAddToCart()}
                                className="w-full font-semibold"
                            >
                                {cartState === 'added' ? (
                                    <>
                                        <Check
                                            className="size-5 shrink-0"
                                            aria-hidden="true"
                                        />
                                        <span>Adicionado ao carrinho</span>
                                    </>
                                ) : (
                                    <>
                                        <ShoppingCart
                                            className="size-5 shrink-0"
                                            aria-hidden="true"
                                        />
                                        <span>
                                            {isOutOfStock
                                                ? 'Produto sem estoque'
                                                : 'Adicionar ao carrinho'}
                                        </span>
                                    </>
                                )}
                            </StoreButton>

                            {cartState === 'error' && cartErrorMessage && (
                                <div
                                    role="alert"
                                    className="flex items-start gap-2 text-sm font-medium text-destructive"
                                >
                                    <AlertCircle
                                        className="mt-0.5 size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>{cartErrorMessage}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Estado 2: Visitante (sem login) */}
                {priceState.status === 'guest' && (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                            <Lock
                                className="size-4 shrink-0 text-muted-foreground"
                                aria-hidden="true"
                            />
                            <span>
                                {priceState.message ??
                                    'Entre para ver seu preço'}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Os preços de tabela e as faixas de atacado são
                            exclusivos para empresas cadastradas.
                        </p>
                        <div>
                            <StoreButton variant="brand" size="lg" asChild>
                                <Link href={resolvedLoginHref}>
                                    Entrar para ver preço e comprar
                                </Link>
                            </StoreButton>
                        </div>
                    </div>
                )}

                {/* Estado 3: Cliente com empresa pendente de aprovação */}
                {priceState.status === 'pending_approval' && (
                    <div className="flex flex-col gap-1.5" role="status">
                        <p className="text-base font-semibold text-warning-muted-foreground">
                            {priceState.message ?? 'Cadastro em análise'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Sua empresa está em validação comercial. Preços e
                            compras serão liberados assim que o cadastro for
                            aprovado.
                        </p>
                    </div>
                )}

                {/* Estado 4: Produto indisponível para o modelo de compra (Padrão/Atacadista), sem botão */}
                {priceState.status === 'unavailable_for_model' && (
                    <div className="flex flex-col gap-1.5" role="status">
                        <p className="text-sm font-semibold text-foreground">
                            {priceState.message ??
                                'Este produto não está disponível para o seu modelo de compra (Padrão/Atacadista)'}
                        </p>
                        {priceState.purchaseModelName && (
                            <p className="text-xs text-muted-foreground">
                                Modelo de compra ativo na sua conta:{' '}
                                <strong className="font-semibold text-foreground">
                                    {priceState.purchaseModelName}
                                </strong>
                            </p>
                        )}
                    </div>
                )}

                <span
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                    className="sr-only"
                >
                    {cartState === 'added'
                        ? `${quantity} ${quantity === 1 ? 'unidade adicionada' : 'unidades adicionadas'} ao carrinho.`
                        : ''}
                </span>
            </div>

            {/* Barra fixa no rodapé no mobile (< md) com área segura `env(safe-area-inset-bottom)` */}
            {(priceState.status === 'available' ||
                priceState.status === 'guest') && (
                <div
                    role="region"
                    aria-label="Ação rápida de compra"
                    className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pt-2.5 px-safe pb-safe shadow-lg backdrop-blur-xs md:hidden"
                >
                    {priceState.status === 'available' ? (
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 flex-col">
                                <span className="truncate text-xs text-muted-foreground tabular-nums">
                                    {formatInteger(quantity)} un. ×{' '}
                                    {formatCentsToBRL(activeUnitPriceCents)}
                                    {isWholesaleApplied ? ' (atacado)' : ''}
                                </span>
                                <span className="text-base font-bold text-foreground tabular-nums">
                                    {formatCentsToBRL(lineTotalCents)}
                                </span>
                            </div>

                            <StoreButton
                                type="button"
                                variant={isOutOfStock ? 'outline' : 'brand'}
                                size="touch"
                                disabled={!canSubmitPurchase}
                                loading={cartState === 'loading'}
                                loadingText="Adicionando..."
                                onClick={() => void handleAddToCart()}
                                className="shrink-0 font-semibold"
                            >
                                {cartState === 'added' ? (
                                    <>
                                        <Check
                                            className="size-4 shrink-0"
                                            aria-hidden="true"
                                        />
                                        <span>Adicionado</span>
                                    </>
                                ) : (
                                    <>
                                        <ShoppingCart
                                            className="size-4 shrink-0"
                                            aria-hidden="true"
                                        />
                                        <span>
                                            {isOutOfStock
                                                ? 'Sem estoque'
                                                : 'Adicionar'}
                                        </span>
                                    </>
                                )}
                            </StoreButton>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-medium text-muted-foreground">
                                Entre para ver seu preço
                            </span>
                            <StoreButton
                                variant="brand"
                                size="touch"
                                asChild
                                className="shrink-0"
                            >
                                <Link href={resolvedLoginHref}>
                                    Entrar na conta
                                </Link>
                            </StoreButton>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}

export default ProductBuyBox;
