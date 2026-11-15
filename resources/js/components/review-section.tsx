import { Form, Link, router } from '@inertiajs/react';
import {
    BadgeCheck,
    ChevronLeft,
    ChevronRight,
    Clock,
    Lock,
    MessageSquareText,
    Star,
} from 'lucide-react';
import { useCallback, useId, useState } from 'react';
import { StoreButton } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import InputError from '@/components/input-error';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { formatInteger } from '@/lib/format';
import { cn } from '@/lib/utils';
import type {
    ReviewFilters,
    ReviewPermission,
    ReviewSummary,
    ReviewsPagination,
} from '@/types/product';

export type ReviewSectionProps = {
    summary: ReviewSummary;
    filters: ReviewFilters;
    list: ReviewsPagination;
    permission: ReviewPermission;
    submitHref: string;
    loginHref: string;
    productUrl: string;
    className?: string;
};

const RATING_LEVELS: ReadonlyArray<'5' | '4' | '3' | '2' | '1'> = [
    '5',
    '4',
    '3',
    '2',
    '1',
];

const RATING_LABELS: Record<number, string> = {
    1: '1 estrela — Ruim',
    2: '2 estrelas — Regular',
    3: '3 estrelas — Bom',
    4: '4 estrelas — Muito bom',
    5: '5 estrelas — Excelente',
};

const SORT_OPTIONS: ReadonlyArray<{
    value: ReviewFilters['sort'];
    label: string;
}> = [
    { value: 'recent', label: 'Mais recentes' },
    { value: 'highest', label: 'Maior nota' },
    { value: 'lowest', label: 'Menor nota' },
];

function formatReviewDate(isoDate: string): string {
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) {
        return '';
    }

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(parsed);
}

function StarRatingDisplay({
    rating,
    size = 'sm',
}: {
    rating: number;
    size?: 'sm' | 'md';
}) {
    const rounded = Math.round(rating);
    const iconClass = size === 'md' ? 'size-5' : 'size-4';

    return (
        <div
            role="img"
            aria-label={`Nota ${rating.toFixed(1).replace('.', ',')} de 5 estrelas`}
            className="inline-flex items-center gap-0.5"
        >
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    aria-hidden="true"
                    className={cn(
                        iconClass,
                        star <= rounded
                            ? 'fill-warning text-warning'
                            : 'text-muted-foreground/35',
                    )}
                />
            ))}
        </div>
    );
}

export function ReviewSectionSkeleton() {
    return (
        <section
            aria-label="Carregando avaliações do produto"
            aria-busy="true"
            className="flex flex-col gap-8 border-t border-border pt-8"
        >
            <div className="flex flex-col gap-2">
                <Skeleton className="h-7 w-56" />
                <Skeleton className="h-4 w-80 max-w-full" />
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                <div className="flex flex-col gap-4 lg:col-span-4">
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <div className="flex flex-col gap-2">
                        {Array.from({ length: 5 }, (_, idx) => (
                            <Skeleton key={idx} className="h-5 w-full" />
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-4 lg:col-span-8">
                    {Array.from({ length: 3 }, (_, idx) => (
                        <div
                            key={idx}
                            className="flex flex-col gap-2.5 border-b border-border pb-5"
                        >
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-5 w-64" />
                            <Skeleton className="h-14 w-full" />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/**
 * Seção de avaliações e comentários B2B (item 4.5):
 * - Resumo com média, estrelas e barras acessíveis de distribuição por nota (5 a 1).
 * - Filtro "Somente compradores" e ordenação (`recent` / `highest` / `lowest`) via `router.get`
 *   com `only: ['reviews']`, `preserveState: true` e `preserveScroll: true`.
 * - Selo verificador calculado pelo sistema ("Comprou este produto" vs. "Ainda não comprou")
 *   exibido sempre com ícone + texto (nunca só cor).
 * - Conteúdo textual renderizado exclusivamente como texto puro JSX (sem HTML).
 * - Formulário com `<Form>` do Inertia v3 (POST na criação, PUT quando `permission.own` existe),
 *   radios acessíveis de 1 a 5 estrelas (alvo >= 44x44px) e erros de validação inline.
 */
export function ReviewSection({
    summary,
    filters,
    list,
    permission,
    submitHref,
    loginHref,
    productUrl,
    className,
}: ReviewSectionProps) {
    const sectionId = useId();
    const onlyBuyersCheckboxId = `${sectionId}-only-buyers`;
    const sortSelectId = `${sectionId}-sort`;
    const titleInputId = `${sectionId}-title`;
    const bodyTextareaId = `${sectionId}-body`;
    const ratingErrorId = `${sectionId}-rating-error`;
    const titleErrorId = `${sectionId}-title-error`;
    const bodyErrorId = `${sectionId}-body-error`;

    const existingReview = permission.own;
    const [selectedRating, setSelectedRating] = useState<number>(
        existingReview?.rating ?? 5,
    );

    const applyReviewFilterChange = useCallback(
        (nextOnlyBuyers: boolean, nextSort: ReviewFilters['sort']) => {
            const queryParams: Record<string, string | number | undefined> = {
                reviews_only_buyers: nextOnlyBuyers ? 1 : undefined,
                reviews_sort: nextSort !== 'recent' ? nextSort : undefined,
            };

            router.get(productUrl, queryParams, {
                only: ['reviews'],
                preserveState: true,
                preserveScroll: true,
            });
        },
        [productUrl],
    );

    const handlePageNavigate = useCallback((url: string | null) => {
        if (!url) {
            return;
        }

        router.get(
            url,
            {},
            {
                only: ['reviews'],
                preserveState: true,
                preserveScroll: true,
            },
        );
    }, []);

    const formattedAverage =
        summary.average !== null
            ? summary.average.toFixed(1).replace('.', ',')
            : '—';

    return (
        <section
            id="avaliacoes"
            aria-labelledby={`${sectionId}-heading`}
            className={cn(
                'flex scroll-mt-20 flex-col gap-8 border-t border-border pt-8 lg:pt-10',
                className,
            )}
        >
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between">
                <h2
                    id={`${sectionId}-heading`}
                    className="font-semibold tracking-tight text-foreground"
                >
                    Avaliações de clientes
                </h2>
                <p className="text-sm text-muted-foreground tabular-nums">
                    {summary.total === 0
                        ? 'Nenhuma avaliação registrada até o momento'
                        : summary.total === 1
                          ? '1 avaliação registrada'
                          : `${formatInteger(summary.total)} avaliações registradas`}
                </p>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
                {/* Coluna esquerda: Resumo das notas + Formulário ou estado de permissão */}
                <div className="flex flex-col gap-8 lg:col-span-5">
                    {/* Resumo de média e distribuição por estrelas */}
                    <div className="flex flex-col gap-5 border-b border-border pb-6">
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                                <span className="text-fluid-3xl leading-none font-bold tracking-tight text-foreground tabular-nums">
                                    {formattedAverage}
                                </span>
                                <span className="mt-1 text-xs text-muted-foreground">
                                    de 5,0
                                </span>
                            </div>

                            <div className="flex flex-col gap-1">
                                <StarRatingDisplay
                                    rating={summary.average ?? 0}
                                    size="md"
                                />
                                <span className="text-xs text-muted-foreground tabular-nums">
                                    Baseado em {formatInteger(summary.total)}{' '}
                                    {summary.total === 1
                                        ? 'avaliação'
                                        : 'avaliações'}
                                </span>
                            </div>
                        </div>

                        {/* Barras acessíveis de distribuição por nota (5 a 1) com texto explícito */}
                        <dl
                            aria-label="Distribuição das avaliações por nota"
                            className="flex flex-col gap-2"
                        >
                            {RATING_LEVELS.map((level) => {
                                const count = summary.distribution[level] ?? 0;
                                const percentage =
                                    summary.total > 0
                                        ? Math.round(
                                              (count / summary.total) * 100,
                                          )
                                        : 0;

                                return (
                                    <div
                                        key={level}
                                        className="grid grid-cols-[4rem_minmax(0,1fr)_5.5rem] items-center gap-2.5 text-xs"
                                    >
                                        <dt className="inline-flex items-center gap-1 font-medium text-foreground tabular-nums">
                                            <span>{level}</span>
                                            <Star
                                                className="size-3.5 fill-warning text-warning"
                                                aria-hidden="true"
                                            />
                                        </dt>
                                        <dd className="flex items-center">
                                            <div
                                                role="meter"
                                                aria-label={`Nota ${level} estrelas: ${count} de ${summary.total} avaliações (${percentage}%)`}
                                                aria-valuemin={0}
                                                aria-valuemax={Math.max(
                                                    summary.total,
                                                    1,
                                                )}
                                                aria-valuenow={count}
                                                className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
                                            >
                                                <div
                                                    style={{
                                                        width: `${percentage}%`,
                                                    }}
                                                    className="h-full rounded-full bg-foreground transition-[width] duration-200 ease-out motion-reduce:transition-none"
                                                />
                                            </div>
                                        </dd>
                                        <dd className="text-right text-muted-foreground tabular-nums">
                                            {formatInteger(count)} ({percentage}
                                            %)
                                        </dd>
                                    </div>
                                );
                            })}
                        </dl>
                    </div>

                    {/* Permissão para avaliar: Formulário (aprovado), Visitante (guest) ou Pendente (pending_approval) */}
                    <div aria-labelledby={`${sectionId}-form-heading`}>
                        <h3
                            id={`${sectionId}-form-heading`}
                            className="mb-3 text-base font-semibold text-foreground"
                        >
                            {existingReview
                                ? 'Editar sua avaliação'
                                : 'Avaliar este produto'}
                        </h3>

                        {permission.canReview ? (
                            <Form
                                key={
                                    existingReview
                                        ? `edit-${existingReview.rating}-${existingReview.title ?? ''}`
                                        : 'create-review'
                                }
                                action={submitHref}
                                method={existingReview ? 'put' : 'post'}
                                options={{
                                    preserveScroll: true,
                                }}
                                className="flex flex-col gap-4"
                            >
                                {({
                                    errors,
                                    processing,
                                    recentlySuccessful,
                                }) => (
                                    <>
                                        {/* Seleção de nota 1 a 5 com radio acessível e alvos >= 44x44px */}
                                        <fieldset
                                            aria-describedby={
                                                errors.rating
                                                    ? ratingErrorId
                                                    : undefined
                                            }
                                            className="flex flex-col gap-2"
                                        >
                                            <legend className="text-sm font-medium text-foreground">
                                                Sua nota (1 a 5 estrelas)
                                            </legend>

                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {[1, 2, 3, 4, 5].map((star) => {
                                                    const isSelected =
                                                        selectedRating === star;
                                                    const isFilled =
                                                        star <= selectedRating;

                                                    return (
                                                        <label
                                                            key={star}
                                                            className={cn(
                                                                'relative inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1 rounded-md border px-2.5 py-2 text-xs font-semibold transition-colors duration-150 ease-out focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 motion-reduce:transition-none',
                                                                isSelected
                                                                    ? 'border-brand bg-brand-muted text-foreground'
                                                                    : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground',
                                                            )}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name="rating"
                                                                value={star}
                                                                checked={
                                                                    isSelected
                                                                }
                                                                onChange={() =>
                                                                    setSelectedRating(
                                                                        star,
                                                                    )
                                                                }
                                                                aria-label={
                                                                    RATING_LABELS[
                                                                        star
                                                                    ]
                                                                }
                                                                className="sr-only"
                                                            />
                                                            <Star
                                                                aria-hidden="true"
                                                                className={cn(
                                                                    'size-4',
                                                                    isFilled
                                                                        ? 'fill-warning text-warning'
                                                                        : 'text-muted-foreground',
                                                                )}
                                                            />
                                                            <span className="tabular-nums">
                                                                {star}
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                            </div>

                                            <span className="text-xs text-muted-foreground">
                                                Selecionado:{' '}
                                                {RATING_LABELS[selectedRating]}
                                            </span>

                                            <InputError
                                                id={ratingErrorId}
                                                message={errors.rating}
                                            />
                                        </fieldset>

                                        {/* Título opcional (máx. 120 caracteres) */}
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-baseline justify-between gap-2">
                                                <Label
                                                    htmlFor={titleInputId}
                                                    className="text-sm font-medium text-foreground"
                                                >
                                                    Título da avaliação
                                                </Label>
                                                <span className="text-xs text-muted-foreground">
                                                    Opcional (máx. 120
                                                    caracteres)
                                                </span>
                                            </div>

                                            <Input
                                                id={titleInputId}
                                                name="title"
                                                type="text"
                                                maxLength={120}
                                                defaultValue={
                                                    existingReview?.title ?? ''
                                                }
                                                aria-invalid={
                                                    Boolean(errors.title) ||
                                                    undefined
                                                }
                                                aria-describedby={
                                                    errors.title
                                                        ? titleErrorId
                                                        : undefined
                                                }
                                            />

                                            <InputError
                                                id={titleErrorId}
                                                message={errors.title}
                                            />
                                        </div>

                                        {/* Comentário obrigatório (10 a 2000 caracteres) */}
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-baseline justify-between gap-2">
                                                <Label
                                                    htmlFor={bodyTextareaId}
                                                    className="text-sm font-medium text-foreground"
                                                >
                                                    Comentário sobre o produto
                                                </Label>
                                                <span className="text-xs text-muted-foreground">
                                                    Mín. 10 caracteres
                                                </span>
                                            </div>

                                            <textarea
                                                id={bodyTextareaId}
                                                name="body"
                                                rows={4}
                                                minLength={10}
                                                maxLength={2000}
                                                defaultValue={
                                                    existingReview?.body ?? ''
                                                }
                                                aria-invalid={
                                                    Boolean(errors.body) ||
                                                    undefined
                                                }
                                                aria-describedby={
                                                    errors.body
                                                        ? bodyErrorId
                                                        : undefined
                                                }
                                                className="flex min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-[color,box-shadow,border-color] duration-150 ease-out outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40"
                                            />

                                            <InputError
                                                id={bodyErrorId}
                                                message={errors.body}
                                            />
                                        </div>

                                        <p className="text-xs text-muted-foreground">
                                            O selo &ldquo;Comprou este
                                            produto&rdquo; é atribuído
                                            automaticamente pelo sistema quando
                                            há pedido entregue deste item.
                                        </p>

                                        <div className="flex flex-wrap items-center gap-3">
                                            <StoreButton
                                                type="submit"
                                                variant="default"
                                                size="touch"
                                                loading={processing}
                                                loadingText="Salvando avaliação..."
                                            >
                                                <span>
                                                    {existingReview
                                                        ? 'Atualizar avaliação'
                                                        : 'Enviar avaliação'}
                                                </span>
                                            </StoreButton>

                                            {recentlySuccessful && (
                                                <span
                                                    role="status"
                                                    aria-live="polite"
                                                    className="text-xs font-semibold text-success-muted-foreground"
                                                >
                                                    Avaliação salva com sucesso.
                                                </span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </Form>
                        ) : permission.reason === 'guest' ? (
                            <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                    <Lock
                                        className="size-4 shrink-0 text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                    <span>Entre para avaliar</span>
                                </div>
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    Acesse sua conta B2B para registrar a
                                    experiência da sua empresa com este produto.
                                </p>
                                <div>
                                    <StoreButton
                                        variant="outline"
                                        size="touch"
                                        asChild
                                    >
                                        <Link href={loginHref}>
                                            Entrar para avaliar
                                        </Link>
                                    </StoreButton>
                                </div>
                            </div>
                        ) : (
                            <div
                                role="status"
                                className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/30 p-4"
                            >
                                <p className="text-sm font-semibold text-warning-muted-foreground">
                                    Envio de avaliação disponível após aprovação
                                </p>
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    Assim que o cadastro da sua empresa for
                                    aprovado, você poderá avaliar os produtos do
                                    catálogo.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Coluna direita: Controles de filtro/ordenação + Lista paginada de avaliações */}
                <div className="flex flex-col gap-6 lg:col-span-7">
                    {/* Barra de filtros e ordenação */}
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
                        <div className="flex min-h-11 items-center gap-2.5">
                            <Checkbox
                                id={onlyBuyersCheckboxId}
                                checked={filters.onlyBuyers}
                                onCheckedChange={(checked) =>
                                    applyReviewFilterChange(
                                        checked === true,
                                        filters.sort,
                                    )
                                }
                            />
                            <Label
                                htmlFor={onlyBuyersCheckboxId}
                                className="cursor-pointer text-sm font-medium text-foreground"
                            >
                                Somente compradores verificados
                            </Label>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <Label
                                htmlFor={sortSelectId}
                                className="shrink-0 text-sm font-medium text-foreground"
                            >
                                Ordenar por
                            </Label>
                            <select
                                id={sortSelectId}
                                value={filters.sort}
                                onChange={(event) =>
                                    applyReviewFilterChange(
                                        filters.onlyBuyers,
                                        event.target
                                            .value as ReviewFilters['sort'],
                                    )
                                }
                                className="flex min-h-11 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-xs transition-[color,border-color,box-shadow] duration-150 ease-out outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            >
                                {SORT_OPTIONS.map((option) => (
                                    <option
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Lista de avaliações ou estado vazio */}
                    {list.data.length > 0 ? (
                        <div className="flex flex-col gap-6">
                            <ul
                                aria-label="Comentários de clientes"
                                className="flex flex-col divide-y divide-border"
                            >
                                {list.data.map((review) => {
                                    const formattedDate = formatReviewDate(
                                        review.createdAt,
                                    );
                                    const isPurchased =
                                        review.badge === 'purchased';

                                    return (
                                        <li
                                            key={review.id}
                                            className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex flex-wrap items-center gap-2.5">
                                                    <StarRatingDisplay
                                                        rating={review.rating}
                                                        size="sm"
                                                    />
                                                    <span className="text-sm font-semibold text-foreground">
                                                        {review.authorName}
                                                    </span>
                                                    {review.isOwn && (
                                                        <span className="rounded-sm border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                                                            Sua avaliação
                                                        </span>
                                                    )}
                                                </div>

                                                {formattedDate && (
                                                    <time
                                                        dateTime={
                                                            review.createdAt
                                                        }
                                                        className="text-xs text-muted-foreground tabular-nums"
                                                    >
                                                        {formattedDate}
                                                    </time>
                                                )}
                                            </div>

                                            {/* Selo do sistema (sempre texto + ícone, nunca apenas cor) */}
                                            <div>
                                                {isPurchased ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-sm border border-success/30 bg-success-muted px-2.5 py-0.5 text-xs font-semibold text-success-muted-foreground">
                                                        <BadgeCheck
                                                            className="size-3.5 shrink-0"
                                                            aria-hidden="true"
                                                        />
                                                        <span>
                                                            Comprou este produto
                                                        </span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                                                        <Clock
                                                            className="size-3.5 shrink-0"
                                                            aria-hidden="true"
                                                        />
                                                        <span>
                                                            Ainda não comprou
                                                        </span>
                                                    </span>
                                                )}
                                            </div>

                                            {/* Conteúdo textual puro (nunca interpreta HTML) */}
                                            {review.title && (
                                                <h4 className="text-sm font-semibold text-foreground">
                                                    {review.title}
                                                </h4>
                                            )}

                                            <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                                                {review.body}
                                            </p>
                                        </li>
                                    );
                                })}
                            </ul>

                            {/* Paginação por prevPageUrl / nextPageUrl */}
                            {(list.prevPageUrl !== null ||
                                list.nextPageUrl !== null ||
                                list.lastPage > 1) && (
                                <nav
                                    aria-label="Paginação das avaliações"
                                    className="flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row"
                                >
                                    <p className="text-xs text-muted-foreground tabular-nums">
                                        Página{' '}
                                        <span className="font-semibold text-foreground">
                                            {list.currentPage}
                                        </span>{' '}
                                        de{' '}
                                        <span className="font-semibold text-foreground">
                                            {list.lastPage}
                                        </span>{' '}
                                        ({formatInteger(list.total)}{' '}
                                        {list.total === 1
                                            ? 'avaliação'
                                            : 'avaliações'}
                                        )
                                    </p>

                                    <div className="flex items-center gap-2">
                                        <StoreButton
                                            type="button"
                                            variant="outline"
                                            size="touch"
                                            disabled={!list.prevPageUrl}
                                            onClick={() =>
                                                handlePageNavigate(
                                                    list.prevPageUrl,
                                                )
                                            }
                                        >
                                            <ChevronLeft
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                            <span>Anterior</span>
                                        </StoreButton>

                                        <StoreButton
                                            type="button"
                                            variant="outline"
                                            size="touch"
                                            disabled={!list.nextPageUrl}
                                            onClick={() =>
                                                handlePageNavigate(
                                                    list.nextPageUrl,
                                                )
                                            }
                                        >
                                            <span>Próxima</span>
                                            <ChevronRight
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        </StoreButton>
                                    </div>
                                </nav>
                            )}
                        </div>
                    ) : (
                        <EmptyState
                            icon={MessageSquareText}
                            headingLevel="h3"
                            title={
                                filters.onlyBuyers
                                    ? 'Nenhuma avaliação de comprador verificado'
                                    : 'Este produto ainda não possui avaliações'
                            }
                            description={
                                filters.onlyBuyers
                                    ? 'Não encontramos avaliações com pedido entregue para este filtro. Você pode exibir todas as avaliações registradas.'
                                    : 'Seja o primeiro cliente a compartilhar como foi a experiência da sua empresa com este item.'
                            }
                            actionLabel={
                                filters.onlyBuyers
                                    ? 'Mostrar todas as avaliações'
                                    : undefined
                            }
                            onAction={
                                filters.onlyBuyers
                                    ? () =>
                                          applyReviewFilterChange(
                                              false,
                                              filters.sort,
                                          )
                                    : undefined
                            }
                        />
                    )}
                </div>
            </div>
        </section>
    );
}

export default ReviewSection;
