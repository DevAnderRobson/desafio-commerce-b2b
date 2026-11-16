import { Head, Link, router } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    Check,
    Info,
    Minus,
    Package,
    Plus,
    RotateCcw,
    ShoppingCart,
    Tag,
    Trash2,
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
import { Breadcrumbs } from '@/components/breadcrumbs';
import { StoreButton } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import InputError from '@/components/input-error';
import { storeToast } from '@/components/toast';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCentsToBRL, formatInteger } from '@/lib/format';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import type { BreadcrumbItem } from '@/types';
import type {
    CartBlocker,
    CartItemData,
    CartItemIssue,
    CartPageProps,
    CartPriceSource,
    SharedCart,
} from '@/types/cart';
import type {
    CartItemRowProps,
    RemovedCartItemSnapshot,
} from '@/types/cart-ui';

const QUANTITY_DEBOUNCE_MS = 400;
const UNDO_BANNER_DURATION_MS = 7000;

function formatPriceSourceLabel(
    source: CartPriceSource,
    promotionPercent: number | null,
): string {
    const promoSuffix =
        typeof promotionPercent === 'number' && promotionPercent > 0
            ? ` (-${promotionPercent}%)`
            : '';

    switch (source) {
        case 'wholesale':
            return 'Preço de atacado';
        case 'promotion':
            return `Promoção${promoSuffix}`;
        case 'wholesale_promotion':
            return `Atacado + promoção${promoSuffix}`;
        case 'table':
        default:
            return 'Preço de tabela';
    }
}

function getIssueDefaultLabel(issue: CartItemIssue): string {
    switch (issue) {
        case 'inactive':
            return 'Produto indisponível no catálogo';
        case 'unavailable_for_model':
            return 'Indisponível para o modelo de compra da sua empresa';
        case 'out_of_stock':
            return 'Produto sem estoque no momento';
        case 'insufficient_stock':
            return 'Quantidade acima do estoque disponível';
    }
}

function getBlockerLabel(type: CartBlocker): string {
    switch (type) {
        case 'customer_blocked':
            return 'Conta comercial bloqueada';
        case 'customer_not_approved':
            return 'Cadastro em validação comercial';
        case 'credit_limit_exceeded':
            return 'Limite de crédito insuficiente';
        case 'item_issue':
        default:
            return 'Pendência nos itens do carrinho';
    }
}

function extractFirstError(
    errors: Record<string, string | string[] | undefined>,
    fallback: string,
): string {
    const raw =
        errors.quantity ??
        errors.product_id ??
        errors.cart ??
        Object.values(errors)[0];

    if (Array.isArray(raw)) {
        return raw[0] ?? fallback;
    }

    return typeof raw === 'string' && raw.trim() !== '' ? raw : fallback;
}

function CartItemRow({
    item,
    displayQuantity,
    rawQuantity,
    isOptimistic,
    isSyncing,
    isRemoving,
    errorMessage,
    onStepQuantity,
    onInputQuantityChange,
    onInputQuantityBlur,
    onRemove,
}: CartItemRowProps) {
    const quantityInputId = useId();
    const quantityErrorId = `${quantityInputId}-error`;

    const hasListDiscount =
        item.listUnitPriceCents > 0 &&
        item.listUnitPriceCents !== item.unitPriceCents;
    const priceSourceLabel = formatPriceSourceLabel(
        item.priceSource,
        item.promotionPercent,
    );
    const isWholesaleOrPromo = item.priceSource !== 'table';

    // Totais de regra de negócio vêm sempre do servidor; apenas durante o debounce/sincronização
    // otimista da linha exibimos `displayQuantity * item.unitPriceCents`.
    const displayLineTotalCents = isOptimistic
        ? displayQuantity * item.unitPriceCents
        : item.lineTotalCents;

    const canAdjustQuantity =
        item.maxQuantity > 0 &&
        item.issue !== 'inactive' &&
        item.issue !== 'unavailable_for_model' &&
        item.issue !== 'out_of_stock';

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            onStepQuantity(item, 1);
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            onStepQuantity(item, -1);
        }
    };

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        onInputQuantityChange(item, event.target.value);
    };

    return (
        <li
            className={cn(
                'flex flex-col gap-4 py-5 first:pt-0 sm:py-6',
                isRemoving && 'opacity-60',
            )}
        >
            {/* Sinalização semântica de item com problema (texto + ícone, nunca só cor) */}
            {item.issue !== null && (
                <div
                    role="alert"
                    className="flex items-start gap-2.5 rounded-md border border-destructive/35 bg-destructive/8 px-3.5 py-2.5 text-sm text-foreground"
                >
                    <XCircle
                        className="mt-0.5 size-4 shrink-0 text-destructive"
                        aria-hidden="true"
                    />
                    <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-destructive">
                            {getIssueDefaultLabel(item.issue)}
                        </span>
                        <span className="text-foreground/90">
                            {item.issueMessage ??
                                'Ajuste a quantidade ou remova este item para prosseguir com o pedido.'}
                        </span>
                    </div>
                </div>
            )}

            {/* Aviso discreto de alteração de preço ou estoque desde a última visita */}
            {item.changeNotice && (
                <div
                    role="status"
                    className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-muted/60 px-3 py-2 text-xs font-medium text-warning-muted-foreground"
                >
                    <Info
                        className="mt-0.5 size-3.5 shrink-0"
                        aria-hidden="true"
                    />
                    <span>{item.changeNotice}</span>
                </div>
            )}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                {/* Bloco esquerdo: Imagem 1:1 + Identificação + Preço unitário + Origem + Dica de atacado */}
                <div className="flex min-w-0 flex-1 items-start gap-3.5 sm:gap-4">
                    <Link
                        href={item.href}
                        className="relative size-20 shrink-0 overflow-hidden rounded-md border border-border/70 bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:size-24"
                    >
                        {item.imageUrl ? (
                            <img
                                src={item.imageUrl}
                                alt={item.imageAlt || item.name}
                                width={96}
                                height={96}
                                loading="lazy"
                                decoding="async"
                                className="size-full object-cover"
                            />
                        ) : (
                            <div className="flex size-full flex-col items-center justify-center gap-1 p-2 text-muted-foreground">
                                <Package
                                    className="size-6 stroke-[1.5]"
                                    aria-hidden="true"
                                />
                                <span className="max-w-full truncate text-[10px] font-medium">
                                    {item.brand}
                                </span>
                            </div>
                        )}
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                            {item.brand && (
                                <span className="font-medium text-foreground/85">
                                    {item.brand}
                                </span>
                            )}
                            {item.brand && item.sku && (
                                <span aria-hidden="true">·</span>
                            )}
                            {item.sku && (
                                <span className="font-mono tabular-nums">
                                    SKU: {item.sku}
                                </span>
                            )}
                        </div>

                        <h3 className="text-fluid-base leading-snug font-semibold text-foreground">
                            <Link
                                href={item.href}
                                className="rounded-xs underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            >
                                {item.name}
                            </Link>
                        </h3>

                        {/* Preço unitário + Preço de tabela riscado quando diferente + Origem do preço */}
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pt-0.5">
                            {hasListDiscount && (
                                <span className="text-xs text-muted-foreground tabular-nums line-through">
                                    De{' '}
                                    {formatCentsToBRL(item.listUnitPriceCents)}
                                </span>
                            )}

                            <span className="text-base font-bold text-foreground tabular-nums">
                                {formatCentsToBRL(item.unitPriceCents)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                / un.
                            </span>

                            <span
                                className={cn(
                                    'inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-semibold tabular-nums',
                                    item.priceSource === 'wholesale' ||
                                        item.priceSource ===
                                            'wholesale_promotion'
                                        ? 'border-success/30 bg-success-muted text-success-muted-foreground'
                                        : isWholesaleOrPromo
                                          ? 'border-brand/25 bg-brand-muted text-brand-muted-foreground'
                                          : 'border-border bg-secondary text-secondary-foreground',
                                )}
                            >
                                {item.priceSource === 'wholesale' ||
                                item.priceSource === 'wholesale_promotion' ? (
                                    <Check
                                        className="size-3 shrink-0"
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <Tag
                                        className="size-3 shrink-0"
                                        aria-hidden="true"
                                    />
                                )}
                                <span>{priceSourceLabel}</span>
                            </span>
                        </div>

                        {/* Dica de atacado: "+N un. para R$ X cada" */}
                        {item.wholesaleHint !== null &&
                            item.wholesaleHint.missingUnits > 0 && (
                                <p className="pt-0.5 text-xs font-medium text-brand-muted-foreground">
                                    +
                                    {formatInteger(
                                        item.wholesaleHint.missingUnits,
                                    )}{' '}
                                    un. para{' '}
                                    <strong className="font-semibold tabular-nums">
                                        {formatCentsToBRL(
                                            item.wholesaleHint.unitPriceCents,
                                        )}
                                    </strong>{' '}
                                    cada
                                </p>
                            )}
                    </div>
                </div>

                {/* Bloco direito: Stepper de quantidade + Subtotal da linha + Remover */}
                <div className="flex flex-col gap-2.5 sm:items-end">
                    <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                        <div className="flex flex-col gap-1">
                            <Label
                                htmlFor={quantityInputId}
                                className="text-xs font-medium text-muted-foreground"
                            >
                                Quantidade (máx.{' '}
                                {formatInteger(Math.max(item.maxQuantity, 0))}{' '}
                                un.)
                            </Label>

                            <div className="inline-flex items-center gap-1.5">
                                <StoreButton
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    disabled={
                                        !canAdjustQuantity ||
                                        isRemoving ||
                                        displayQuantity <= 1
                                    }
                                    onClick={() => onStepQuantity(item, -1)}
                                    aria-label={`Diminuir quantidade de ${item.name}`}
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
                                    max={Math.max(item.maxQuantity, 1)}
                                    step={1}
                                    disabled={!canAdjustQuantity || isRemoving}
                                    value={rawQuantity}
                                    onChange={handleChange}
                                    onBlur={() => onInputQuantityBlur(item)}
                                    onKeyDown={handleKeyDown}
                                    aria-invalid={
                                        Boolean(errorMessage) || undefined
                                    }
                                    aria-describedby={
                                        errorMessage
                                            ? quantityErrorId
                                            : undefined
                                    }
                                    className="min-h-11 w-20 [appearance:textfield] text-center font-semibold tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />

                                <StoreButton
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    disabled={
                                        !canAdjustQuantity ||
                                        isRemoving ||
                                        displayQuantity >= item.maxQuantity
                                    }
                                    onClick={() => onStepQuantity(item, 1)}
                                    aria-label={`Aumentar quantidade de ${item.name}`}
                                >
                                    <Plus
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </StoreButton>
                            </div>
                        </div>

                        <div
                            aria-live="polite"
                            aria-atomic="true"
                            className="flex flex-col items-end"
                        >
                            <span className="text-xs font-medium text-muted-foreground">
                                Subtotal ({formatInteger(displayQuantity)}{' '}
                                {displayQuantity === 1 ? 'un.' : 'un.'})
                            </span>
                            <span className="text-fluid-lg font-bold tracking-tight text-foreground tabular-nums">
                                {formatCentsToBRL(displayLineTotalCents)}
                            </span>
                            {isSyncing && (
                                <span className="text-[11px] font-medium text-muted-foreground">
                                    Atualizando...
                                </span>
                            )}
                        </div>
                    </div>

                    <InputError
                        id={quantityErrorId}
                        message={errorMessage ?? undefined}
                    />

                    <div className="flex items-center justify-end">
                        <StoreButton
                            type="button"
                            variant="ghost"
                            size="touch"
                            disabled={isRemoving}
                            loading={isRemoving}
                            loadingText="Removendo..."
                            onClick={() => onRemove(item)}
                            aria-label={`Remover ${item.name} do carrinho`}
                            className="h-11 px-3 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                            <Trash2
                                className="size-4 shrink-0"
                                aria-hidden="true"
                            />
                            <span>Remover</span>
                        </StoreButton>
                    </div>
                </div>
            </div>
        </li>
    );
}

/**
 * Página do carrinho de compras B2B (Onda 5 - item 5.3):
 * - Lista de itens com imagem 1:1, nome, marca/SKU, preço unitário e origem do preço
 *   (tabela / atacado / promoção, com preço de tabela riscado quando diferente).
 * - Dica de atacado ("+N un. para R$ X cada") quando `wholesaleHint` presente.
 * - Stepper de quantidade com UI otimista e debounce de ~400ms disparando um único
 *   `router.patch` por rajada para `${routes.itemBase}/${id}`, reconciliando com o servidor.
 * - Remoção de item com opção "Desfazer" (barra + toast) que reenvia `router.post(routes.itemStore, { product_id, quantity })`.
 * - "Esvaziar carrinho" com modal de confirmação acessível.
 * - Itens com `issue` permanecem visíveis e sinalizados com ícone + texto; `changeNotice` discreto.
 * - `blockers` listados acima do resumo; resumo fixo ao lado no desktop (sticky) e barra inferior no mobile.
 * - Único CTA primário "Continuar para entrega" (desabilitado com explicação quando `!canProceed`).
 */
export default function StoreCartPage({ cart, routes }: CartPageProps) {
    const cannotProceedReasonId = useId();
    const mobileCannotProceedReasonId = useId();

    // Estado otimista por item durante o debounce/requisição PATCH
    const [optimisticQuantities, setOptimisticQuantities] = useState<
        Record<number, number>
    >({});
    const [rawInputs, setRawInputs] = useState<Record<number, string>>({});
    const [syncingItems, setSyncingItems] = useState<Record<number, boolean>>(
        {},
    );
    const [removingItems, setRemovingItems] = useState<Record<number, boolean>>(
        {},
    );
    const [itemErrors, setItemErrors] = useState<Record<number, string>>({});

    // Estado para "Desfazer" remoção e "Esvaziar carrinho"
    const [removedSnapshot, setRemovedSnapshot] =
        useState<RemovedCartItemSnapshot | null>(null);
    const [isUndoing, setIsUndoing] = useState(false);
    const [clearDialogOpen, setClearDialogOpen] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    // Timers de debounce por item (`itemId -> timeoutId`) e timer do banner de desfazer
    const debounceTimersRef = useRef<
        Map<number, ReturnType<typeof setTimeout>>
    >(new Map());
    const pendingTargetQuantitiesRef = useRef<Map<number, number>>(new Map());
    const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Reconcilia os valores otimistas quando as props do servidor chegam e não há debounce pendente para o item
    const [lastServerSignature, setLastServerSignature] = useState(() =>
        cart.items
            .map((i) => `${i.id}:${i.quantity}:${i.maxQuantity}`)
            .join('|'),
    );
    const currentServerSignature = cart.items
        .map((i) => `${i.id}:${i.quantity}:${i.maxQuantity}`)
        .join('|');

    if (currentServerSignature !== lastServerSignature) {
        setLastServerSignature(currentServerSignature);

        const nextOptimistic: Record<number, number> = {};
        const nextRawInputs: Record<number, string> = {};

        for (const item of cart.items) {
            if (
                optimisticQuantities[item.id] !== undefined &&
                syncingItems[item.id]
            ) {
                nextOptimistic[item.id] = optimisticQuantities[item.id];
                nextRawInputs[item.id] =
                    rawInputs[item.id] ?? String(optimisticQuantities[item.id]);
            }
        }

        setOptimisticQuantities(nextOptimistic);
        setRawInputs(nextRawInputs);
    }

    useEffect(() => {
        const timersMap = debounceTimersRef.current;

        return () => {
            timersMap.forEach((timerId) => {
                clearTimeout(timerId);
            });
            timersMap.clear();

            if (undoTimerRef.current !== null) {
                clearTimeout(undoTimerRef.current);
            }
        };
    }, []);

    const clearItemDebounce = useCallback((itemId: number) => {
        const existingTimer = debounceTimersRef.current.get(itemId);
        if (existingTimer !== undefined) {
            clearTimeout(existingTimer);
            debounceTimersRef.current.delete(itemId);
        }
        pendingTargetQuantitiesRef.current.delete(itemId);
    }, []);

    const dispatchPatchQuantity = useCallback(
        (item: CartItemData, targetQuantity: number) => {
            debounceTimersRef.current.delete(item.id);
            pendingTargetQuantitiesRef.current.delete(item.id);

            const quantityDelta = targetQuantity - item.quantity;

            setSyncingItems((prev) => ({ ...prev, [item.id]: true }));

            router
                .optimistic<{ cart?: SharedCart }>((props) => ({
                    cart: {
                        ...props.cart,
                        count: Math.max(
                            0,
                            (props.cart?.count ?? cart.count) + quantityDelta,
                        ),
                    },
                }))
                .patch(
                    `${routes.itemBase}/${item.id}`,
                    { quantity: targetQuantity },
                    {
                        preserveScroll: true,
                        preserveState: true,
                        onSuccess: () => {
                            if (!debounceTimersRef.current.has(item.id)) {
                                setOptimisticQuantities((prev) => {
                                    const next = { ...prev };
                                    delete next[item.id];
                                    return next;
                                });
                                setRawInputs((prev) => {
                                    const next = { ...prev };
                                    delete next[item.id];
                                    return next;
                                });
                            }
                        },
                        onError: (errors) => {
                            const message = extractFirstError(
                                errors,
                                'Não foi possível atualizar a quantidade deste item.',
                            );

                            setOptimisticQuantities((prev) => {
                                const next = { ...prev };
                                delete next[item.id];
                                return next;
                            });
                            setRawInputs((prev) => {
                                const next = { ...prev };
                                delete next[item.id];
                                return next;
                            });
                            setItemErrors((prev) => ({
                                ...prev,
                                [item.id]: message,
                            }));
                            storeToast.error(message, {
                                description: item.name,
                            });
                        },
                        onFinish: () => {
                            if (!debounceTimersRef.current.has(item.id)) {
                                setSyncingItems((prev) => {
                                    const next = { ...prev };
                                    delete next[item.id];
                                    return next;
                                });
                            }
                        },
                    },
                );
        },
        [cart.count, routes.itemBase],
    );

    const scheduleQuantityPatch = useCallback(
        (item: CartItemData, nextQuantity: number) => {
            const existingTimer = debounceTimersRef.current.get(item.id);
            if (existingTimer !== undefined) {
                clearTimeout(existingTimer);
            }

            setOptimisticQuantities((prev) => ({
                ...prev,
                [item.id]: nextQuantity,
            }));
            setRawInputs((prev) => ({
                ...prev,
                [item.id]: String(nextQuantity),
            }));
            setItemErrors((prev) => {
                if (!prev[item.id]) {
                    return prev;
                }
                const next = { ...prev };
                delete next[item.id];
                return next;
            });

            // Se o usuário voltou para a quantidade original do servidor antes do disparo e não há sync ativo, cancela o timer
            if (nextQuantity === item.quantity && !syncingItems[item.id]) {
                debounceTimersRef.current.delete(item.id);
                pendingTargetQuantitiesRef.current.delete(item.id);
                setOptimisticQuantities((prev) => {
                    const next = { ...prev };
                    delete next[item.id];
                    return next;
                });
                setRawInputs((prev) => {
                    const next = { ...prev };
                    delete next[item.id];
                    return next;
                });
                return;
            }

            pendingTargetQuantitiesRef.current.set(item.id, nextQuantity);
            setSyncingItems((prev) => ({ ...prev, [item.id]: true }));

            const timerId = setTimeout(() => {
                dispatchPatchQuantity(item, nextQuantity);
            }, QUANTITY_DEBOUNCE_MS);

            debounceTimersRef.current.set(item.id, timerId);
        },
        [dispatchPatchQuantity, syncingItems],
    );

    const handleStepQuantity = useCallback(
        (item: CartItemData, delta: number) => {
            const currentQty = optimisticQuantities[item.id] ?? item.quantity;
            const upperLimit = Math.max(item.maxQuantity, 1);
            const nextQty = Math.min(
                Math.max(currentQty + delta, 1),
                upperLimit,
            );

            if (nextQty === currentQty) {
                return;
            }

            scheduleQuantityPatch(item, nextQty);
        },
        [optimisticQuantities, scheduleQuantityPatch],
    );

    const handleInputQuantityChange = useCallback(
        (item: CartItemData, rawValue: string) => {
            setRawInputs((prev) => ({ ...prev, [item.id]: rawValue }));

            if (rawValue.trim() === '') {
                setItemErrors((prev) => ({
                    ...prev,
                    [item.id]: 'Informe uma quantidade mínima de 1 unidade.',
                }));
                return;
            }

            const parsed = Number.parseInt(rawValue, 10);
            if (!Number.isFinite(parsed) || parsed < 1) {
                setItemErrors((prev) => ({
                    ...prev,
                    [item.id]: 'A quantidade mínima para compra é 1 unidade.',
                }));
                return;
            }

            const upperLimit = Math.max(item.maxQuantity, 1);
            if (item.maxQuantity > 0 && parsed > upperLimit) {
                setItemErrors((prev) => ({
                    ...prev,
                    [item.id]: `Quantidade máxima em estoque: ${formatInteger(upperLimit)} un.`,
                }));
                scheduleQuantityPatch(item, upperLimit);
                return;
            }

            scheduleQuantityPatch(item, Math.trunc(parsed));
        },
        [scheduleQuantityPatch],
    );

    const handleInputQuantityBlur = useCallback(
        (item: CartItemData) => {
            const currentRaw = rawInputs[item.id];
            if (currentRaw === undefined) {
                return;
            }

            const parsed = Number.parseInt(currentRaw, 10);
            const upperLimit = Math.max(item.maxQuantity, 1);

            if (!Number.isFinite(parsed) || parsed < 1) {
                scheduleQuantityPatch(item, 1);
                return;
            }

            if (item.maxQuantity > 0 && parsed > upperLimit) {
                scheduleQuantityPatch(item, upperLimit);
                return;
            }

            setRawInputs((prev) => ({
                ...prev,
                [item.id]: String(Math.trunc(parsed)),
            }));
        },
        [rawInputs, scheduleQuantityPatch],
    );

    const handleUndoRemove = useCallback(
        (snapshot: RemovedCartItemSnapshot) => {
            if (isUndoing) {
                return;
            }

            if (undoTimerRef.current !== null) {
                clearTimeout(undoTimerRef.current);
                undoTimerRef.current = null;
            }

            setIsUndoing(true);
            setRemovedSnapshot(null);

            router
                .optimistic<{ cart?: SharedCart }>((props) => ({
                    cart: {
                        ...props.cart,
                        count:
                            (props.cart?.count ?? cart.count) +
                            snapshot.quantity,
                    },
                }))
                .post(
                    routes.itemStore,
                    {
                        product_id: snapshot.productId,
                        quantity: snapshot.quantity,
                    },
                    {
                        preserveScroll: true,
                        preserveState: true,
                        onSuccess: () => {
                            storeToast.success(
                                `"${snapshot.name}" restaurado ao carrinho.`,
                            );
                        },
                        onError: (errors) => {
                            const message = extractFirstError(
                                errors,
                                'Não foi possível restaurar o item removido.',
                            );
                            storeToast.error(message, {
                                description: snapshot.name,
                            });
                        },
                        onFinish: () => {
                            setIsUndoing(false);
                        },
                    },
                );
        },
        [cart.count, isUndoing, routes.itemStore],
    );

    const handleRemoveItem = useCallback(
        (item: CartItemData) => {
            clearItemDebounce(item.id);

            const effectiveQuantity =
                optimisticQuantities[item.id] ?? item.quantity;
            const snapshot: RemovedCartItemSnapshot = {
                itemId: item.id,
                productId: item.productId,
                name: item.name,
                sku: item.sku,
                quantity: effectiveQuantity,
            };

            setRemovingItems((prev) => ({ ...prev, [item.id]: true }));

            router
                .optimistic<{ cart?: SharedCart }>((props) => ({
                    cart: {
                        ...props.cart,
                        count: Math.max(
                            0,
                            (props.cart?.count ?? cart.count) -
                                effectiveQuantity,
                        ),
                    },
                }))
                .delete(`${routes.itemBase}/${item.id}`, {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => {
                        setRemovedSnapshot(snapshot);

                        if (undoTimerRef.current !== null) {
                            clearTimeout(undoTimerRef.current);
                        }

                        undoTimerRef.current = setTimeout(() => {
                            setRemovedSnapshot((current) =>
                                current?.itemId === snapshot.itemId
                                    ? null
                                    : current,
                            );
                        }, UNDO_BANNER_DURATION_MS);

                        storeToast.info(
                            `"${snapshot.name}" removido do carrinho.`,
                            {
                                duration: 6000,
                                recoveryAction: {
                                    label: 'Desfazer',
                                    onClick: () => handleUndoRemove(snapshot),
                                },
                            },
                        );
                    },
                    onError: (errors) => {
                        const message = extractFirstError(
                            errors,
                            'Não foi possível remover este item do carrinho.',
                        );
                        storeToast.error(message, {
                            description: item.name,
                        });
                    },
                    onFinish: () => {
                        setRemovingItems((prev) => {
                            const next = { ...prev };
                            delete next[item.id];
                            return next;
                        });
                    },
                });
        },
        [
            cart.count,
            clearItemDebounce,
            handleUndoRemove,
            optimisticQuantities,
            routes.itemBase,
        ],
    );

    const handleClearCart = useCallback(() => {
        if (isClearing) {
            return;
        }

        debounceTimersRef.current.forEach((timerId) => {
            clearTimeout(timerId);
        });
        debounceTimersRef.current.clear();
        pendingTargetQuantitiesRef.current.clear();

        setIsClearing(true);

        router
            .optimistic<{ cart?: SharedCart }>((props) => ({
                cart: {
                    ...props.cart,
                    count: 0,
                },
            }))
            .delete(routes.clear, {
                preserveScroll: true,
                onSuccess: () => {
                    setClearDialogOpen(false);
                    setRemovedSnapshot(null);
                    setOptimisticQuantities({});
                    setRawInputs({});
                    storeToast.info('O carrinho foi esvaziado.');
                },
                onError: (errors) => {
                    const message = extractFirstError(
                        errors,
                        'Não foi possível esvaziar o carrinho. Tente novamente.',
                    );
                    storeToast.error(message);
                },
                onFinish: () => {
                    setIsClearing(false);
                },
            });
    }, [isClearing, routes.clear]);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Início',
            href: home(),
        },
        {
            title: 'Carrinho',
            href: '/carrinho',
        },
    ];

    const isEmpty = cart.items.length === 0;
    const disabledProceedExplanation =
        cart.blockers[0]?.message ??
        'Resolva as pendências sinalizadas nos itens ou no cadastro para continuar para a entrega.';

    return (
        <>
            <Head title="Carrinho" />

            <div
                className={cn(
                    'flex flex-col gap-8 lg:gap-10',
                    !isEmpty && 'pb-28 lg:pb-0',
                )}
            >
                {/* Breadcrumb */}
                <div className="border-b border-border/70 pb-3">
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>

                {/* Cabeçalho da página com h1 e ação secundária "Esvaziar carrinho" */}
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <h1 className="font-semibold tracking-tight text-foreground">
                            Carrinho de compras
                        </h1>
                        <p className="text-sm text-muted-foreground tabular-nums">
                            {isEmpty
                                ? 'Nenhum item selecionado no momento.'
                                : `${formatInteger(cart.items.length)} ${cart.items.length === 1 ? 'produto' : 'produtos'} (${formatInteger(cart.count)} ${cart.count === 1 ? 'unidade' : 'unidades'})`}
                        </p>
                    </div>

                    {!isEmpty && (
                        <Dialog
                            open={clearDialogOpen}
                            onOpenChange={setClearDialogOpen}
                        >
                            <DialogTrigger asChild>
                                <StoreButton
                                    type="button"
                                    variant="outline"
                                    size="touch"
                                    className="text-muted-foreground hover:text-destructive"
                                >
                                    <Trash2
                                        className="size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>Esvaziar carrinho</span>
                                </StoreButton>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>
                                        Esvaziar carrinho de compras?
                                    </DialogTitle>
                                    <DialogDescription>
                                        Todos os{' '}
                                        {formatInteger(cart.items.length)}{' '}
                                        {cart.items.length === 1
                                            ? 'item será removido'
                                            : 'itens serão removidos'}{' '}
                                        do seu carrinho atual.
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter className="gap-2 pt-2">
                                    <DialogClose asChild>
                                        <StoreButton
                                            type="button"
                                            variant="outline"
                                            size="touch"
                                            disabled={isClearing}
                                        >
                                            Manter itens
                                        </StoreButton>
                                    </DialogClose>
                                    <StoreButton
                                        type="button"
                                        variant="destructive"
                                        size="touch"
                                        loading={isClearing}
                                        loadingText="Esvaziando..."
                                        onClick={handleClearCart}
                                    >
                                        Confirmar e esvaziar
                                    </StoreButton>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </header>

                {/* Barra de recuperação ("Desfazer" remoção) visível mesmo se o último item foi removido */}
                {removedSnapshot && (
                    <div
                        role="status"
                        aria-live="polite"
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-secondary/70 px-4 py-3 text-sm text-foreground"
                    >
                        <div className="flex items-center gap-2">
                            <RotateCcw
                                className="size-4 shrink-0 text-muted-foreground"
                                aria-hidden="true"
                            />
                            <span>
                                <strong>{removedSnapshot.name}</strong> (
                                {formatInteger(removedSnapshot.quantity)} un.)
                                foi removido do carrinho.
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <StoreButton
                                type="button"
                                variant="outline"
                                size="touch"
                                loading={isUndoing}
                                loadingText="Restaurando..."
                                onClick={() =>
                                    handleUndoRemove(removedSnapshot)
                                }
                                className="h-11 bg-background font-semibold"
                            >
                                Desfazer
                            </StoreButton>
                        </div>
                    </div>
                )}

                {/* Estado vazio */}
                {isEmpty ? (
                    <EmptyState
                        icon={ShoppingCart}
                        title="Seu carrinho está vazio"
                        description="Consulte o catálogo corporativo para adicionar produtos com preços da sua tabela comercial e condições de atacado."
                        actionLabel="Ir para o catálogo da loja"
                        actionHref={routes.shop}
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start lg:gap-10">
                        {/* Coluna principal (esquerda >= lg): Lista de itens */}
                        <section
                            aria-labelledby="cart-items-heading"
                            className="flex flex-col gap-4 lg:col-span-7 xl:col-span-8"
                        >
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <h2
                                    id="cart-items-heading"
                                    className="text-fluid-lg font-semibold tracking-tight text-foreground"
                                >
                                    Itens do pedido
                                </h2>
                                <Link
                                    href={routes.shop}
                                    className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                >
                                    <ArrowLeft
                                        className="size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>Continuar comprando</span>
                                </Link>
                            </div>

                            <ul className="divide-y divide-border border-b border-border">
                                {cart.items.map((item) => {
                                    const optimisticQty =
                                        optimisticQuantities[item.id];
                                    const displayQuantity =
                                        optimisticQty ?? item.quantity;
                                    const rawQuantity =
                                        rawInputs[item.id] ??
                                        String(displayQuantity);
                                    const isOptimistic =
                                        optimisticQty !== undefined &&
                                        optimisticQty !== item.quantity;

                                    return (
                                        <CartItemRow
                                            key={item.id}
                                            item={item}
                                            displayQuantity={displayQuantity}
                                            rawQuantity={rawQuantity}
                                            isOptimistic={isOptimistic}
                                            isSyncing={Boolean(
                                                syncingItems[item.id],
                                            )}
                                            isRemoving={Boolean(
                                                removingItems[item.id],
                                            )}
                                            errorMessage={
                                                itemErrors[item.id] ?? null
                                            }
                                            onStepQuantity={handleStepQuantity}
                                            onInputQuantityChange={
                                                handleInputQuantityChange
                                            }
                                            onInputQuantityBlur={
                                                handleInputQuantityBlur
                                            }
                                            onRemove={handleRemoveItem}
                                        />
                                    );
                                })}
                            </ul>
                        </section>

                        {/* Coluna lateral (direita >= lg, sticky): Bloqueios + Resumo financeiro + CTA único */}
                        <aside
                            aria-labelledby="cart-summary-heading"
                            className="flex flex-col gap-5 lg:sticky lg:top-24 lg:col-span-5 xl:col-span-4"
                        >
                            {/* Bloqueios listados acima do resumo */}
                            {cart.blockers.length > 0 && (
                                <div
                                    role="alert"
                                    aria-label="Impedimentos para avançar com o pedido"
                                    className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/8 p-4 text-sm text-foreground"
                                >
                                    <div className="flex items-center gap-2 font-semibold text-destructive">
                                        <AlertTriangle
                                            className="size-4 shrink-0"
                                            aria-hidden="true"
                                        />
                                        <span>
                                            Atenção antes de continuar para a
                                            entrega
                                        </span>
                                    </div>

                                    <ul className="flex flex-col gap-2">
                                        {cart.blockers.map((blocker, index) => (
                                            <li
                                                key={`${blocker.type}-${index}`}
                                                className="flex items-start gap-2 text-xs leading-relaxed sm:text-sm"
                                            >
                                                <AlertCircle
                                                    className="mt-0.5 size-4 shrink-0 text-destructive"
                                                    aria-hidden="true"
                                                />
                                                <div>
                                                    <span className="font-semibold text-foreground">
                                                        {getBlockerLabel(
                                                            blocker.type,
                                                        )}
                                                        :{' '}
                                                    </span>
                                                    <span className="text-foreground/90">
                                                        {blocker.message}
                                                    </span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Resumo do pedido (sem card dentro de card) */}
                            <div className="flex flex-col gap-5 rounded-lg border border-border bg-card p-5 text-card-foreground sm:p-6">
                                <h2
                                    id="cart-summary-heading"
                                    className="text-fluid-lg font-semibold tracking-tight text-foreground"
                                >
                                    Resumo do pedido
                                </h2>

                                <dl className="flex flex-col gap-3 text-sm tabular-nums">
                                    <div className="flex items-center justify-between gap-4">
                                        <dt className="text-muted-foreground">
                                            Subtotal (
                                            {formatInteger(cart.count)}{' '}
                                            {cart.count === 1
                                                ? 'unidade'
                                                : 'unidades'}
                                            )
                                        </dt>
                                        <dd className="font-medium text-foreground">
                                            {formatCentsToBRL(
                                                cart.totals.subtotalCents,
                                            )}
                                        </dd>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <dt className="text-muted-foreground">
                                            Economia (atacado / promoção)
                                        </dt>
                                        <dd
                                            className={cn(
                                                'font-semibold',
                                                cart.totals.savingsCents > 0
                                                    ? 'text-success-muted-foreground'
                                                    : 'text-muted-foreground',
                                            )}
                                        >
                                            {cart.totals.savingsCents > 0
                                                ? `- ${formatCentsToBRL(cart.totals.savingsCents)}`
                                                : formatCentsToBRL(0)}
                                        </dd>
                                    </div>

                                    {cart.totals.shippingCents > 0 && (
                                        <div className="flex items-center justify-between gap-4">
                                            <dt className="text-muted-foreground">
                                                Frete
                                            </dt>
                                            <dd className="font-medium text-foreground">
                                                {formatCentsToBRL(
                                                    cart.totals.shippingCents,
                                                )}
                                            </dd>
                                        </div>
                                    )}

                                    {cart.totals.surchargeCents > 0 && (
                                        <div className="flex items-center justify-between gap-4">
                                            <dt className="text-muted-foreground">
                                                Acréscimo financeiro
                                            </dt>
                                            <dd className="font-medium text-foreground">
                                                {formatCentsToBRL(
                                                    cart.totals.surchargeCents,
                                                )}
                                            </dd>
                                        </div>
                                    )}

                                    <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
                                        <dt className="text-base font-semibold text-foreground">
                                            Total do carrinho
                                        </dt>
                                        <dd
                                            aria-live="polite"
                                            aria-atomic="true"
                                            className="text-fluid-2xl font-bold tracking-tight text-foreground"
                                        >
                                            {formatCentsToBRL(
                                                cart.totals.totalCents,
                                            )}
                                        </dd>
                                    </div>
                                </dl>

                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    Frete e condição de pagamento são definidos
                                    nas próximas etapas do fechamento.
                                </p>

                                {/* CTA único primário: "Continuar para entrega" */}
                                <div className="flex flex-col gap-2 pt-1">
                                    {cart.canProceed ? (
                                        <StoreButton
                                            variant="brand"
                                            size="lg"
                                            asChild
                                            className="w-full font-semibold"
                                        >
                                            <Link href={routes.checkout}>
                                                <span>
                                                    Continuar para entrega
                                                </span>
                                                <ArrowRight
                                                    className="size-4 shrink-0"
                                                    aria-hidden="true"
                                                />
                                            </Link>
                                        </StoreButton>
                                    ) : (
                                        <>
                                            <StoreButton
                                                type="button"
                                                variant="brand"
                                                size="lg"
                                                disabled
                                                aria-describedby={
                                                    cannotProceedReasonId
                                                }
                                                className="w-full font-semibold"
                                            >
                                                <span>
                                                    Continuar para entrega
                                                </span>
                                                <ArrowRight
                                                    className="size-4 shrink-0"
                                                    aria-hidden="true"
                                                />
                                            </StoreButton>
                                            <p
                                                id={cannotProceedReasonId}
                                                className="flex items-start gap-1.5 text-xs font-medium text-destructive"
                                            >
                                                <AlertCircle
                                                    className="mt-0.5 size-3.5 shrink-0"
                                                    aria-hidden="true"
                                                />
                                                <span>
                                                    {disabledProceedExplanation}
                                                </span>
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </aside>
                    </div>
                )}
            </div>

            {/* Barra inferior fixa no mobile (< lg) com área segura `env(safe-area-inset-*)` */}
            {!isEmpty && (
                <div
                    role="region"
                    aria-label="Resumo rápido e avanço para entrega"
                    className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pt-2.5 px-safe pb-safe shadow-lg backdrop-blur-xs lg:hidden"
                >
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 flex-col">
                                <span className="truncate text-xs text-muted-foreground tabular-nums">
                                    Total ({formatInteger(cart.count)}{' '}
                                    {cart.count === 1 ? 'un.' : 'un.'})
                                    {cart.totals.savingsCents > 0
                                        ? ` · Economia ${formatCentsToBRL(cart.totals.savingsCents)}`
                                        : ''}
                                </span>
                                <span className="text-base font-bold text-foreground tabular-nums">
                                    {formatCentsToBRL(cart.totals.totalCents)}
                                </span>
                            </div>

                            {cart.canProceed ? (
                                <StoreButton
                                    variant="brand"
                                    size="touch"
                                    asChild
                                    className="shrink-0 font-semibold"
                                >
                                    <Link href={routes.checkout}>
                                        <span>Continuar para entrega</span>
                                        <ArrowRight
                                            className="size-4 shrink-0"
                                            aria-hidden="true"
                                        />
                                    </Link>
                                </StoreButton>
                            ) : (
                                <StoreButton
                                    type="button"
                                    variant="brand"
                                    size="touch"
                                    disabled
                                    aria-describedby={
                                        mobileCannotProceedReasonId
                                    }
                                    className="shrink-0 font-semibold"
                                >
                                    <span>Continuar para entrega</span>
                                </StoreButton>
                            )}
                        </div>

                        {!cart.canProceed && (
                            <p
                                id={mobileCannotProceedReasonId}
                                className="truncate text-xs font-medium text-destructive"
                            >
                                {disabledProceedExplanation}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
