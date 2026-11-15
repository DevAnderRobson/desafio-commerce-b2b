import { router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    Package,
    RotateCcw,
    Search,
    X,
} from 'lucide-react';
import {
    useCallback,
    useEffect,
    useId,
    useRef,
    useState,
    type FormEvent,
    type KeyboardEvent,
} from 'react';
import { StoreButton } from '@/components/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { cn } from '@/lib/utils';
import type { SearchSuggestion } from '@/types/search';

export type SearchBoxProps = {
    initialQuery?: string;
    placeholder?: string;
    autoFocus?: boolean;
    variant?: 'desktop' | 'mobile';
    inputId?: string;
    onAfterNavigate?: () => void;
    onCloseOverlay?: () => void;
    className?: string;
};

/**
 * Busca do navbar (desktop e overlay mobile) com combobox acessível (ARIA 1.2)
 * e debounce estrito de 3 000 ms sem digitar antes de consultar `search.suggest`.
 * Enter, botão "Buscar" e rodapé "Busca avançada" navegam imediatamente para `/buscar?q=...`.
 */
export function SearchBox({
    initialQuery,
    placeholder = 'Buscar por nome, SKU, código EAN ou marca...',
    autoFocus = false,
    variant = 'desktop',
    inputId: externalInputId,
    onAfterNavigate,
    onCloseOverlay,
    className,
}: SearchBoxProps) {
    const page = usePage();
    const pageQuery =
        typeof page.props.query === 'string' ? page.props.query : '';
    const resolvedInitialQuery = initialQuery ?? pageQuery;

    const generatedId = useId();
    const inputId = externalInputId ?? `search-box-input-${generatedId}`;
    const listboxId = `search-box-listbox-${generatedId}`;
    const statusLiveId = `search-box-live-${generatedId}`;

    const containerRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const {
        query,
        trimmedQuery,
        status,
        items,
        total,
        errorMessage,
        isOpen,
        setIsOpen,
        handleQueryChange,
        clearSearch,
        retrySuggestions,
        submitSearch,
        cancelPending,
    } = useDebouncedSearch({
        initialQuery: resolvedInitialQuery,
    });

    const [activeIndex, setActiveIndex] = useState<number>(-1);

    const showPanel = isOpen && status !== 'idle';
    const hasInteractiveOptions =
        showPanel && status === 'success' && items.length > 0;

    const effectiveActiveIndex =
        hasInteractiveOptions && activeIndex >= 0 && activeIndex < items.length
            ? activeIndex
            : -1;

    const activeDescendantId =
        effectiveActiveIndex >= 0
            ? `${listboxId}-option-${effectiveActiveIndex}`
            : undefined;

    // Fecha o painel ao clicar fora do componente
    useEffect(() => {
        if (!showPanel) {
            return;
        }

        const handlePointerDown = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node | null;
            if (
                containerRef.current &&
                target &&
                !containerRef.current.contains(target)
            ) {
                cancelPending();
                setIsOpen(false);
                setActiveIndex(-1);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('touchstart', handlePointerDown, {
            passive: true,
        });

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('touchstart', handlePointerDown);
        };
    }, [cancelPending, setIsOpen, showPanel]);

    const handleSelectSuggestion = useCallback(
        (suggestion: SearchSuggestion) => {
            cancelPending();
            setIsOpen(false);
            setActiveIndex(-1);
            onAfterNavigate?.();
            router.get(suggestion.href);
        },
        [cancelPending, onAfterNavigate, setIsOpen],
    );

    const handleFullSearch = useCallback(() => {
        setActiveIndex(-1);
        submitSearch();
        onAfterNavigate?.();
    }, [onAfterNavigate, submitSearch]);

    const handleFormSubmit = useCallback(
        (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();

            if (
                effectiveActiveIndex >= 0 &&
                items[effectiveActiveIndex] !== undefined
            ) {
                handleSelectSuggestion(items[effectiveActiveIndex]);
                return;
            }

            handleFullSearch();
        },
        [effectiveActiveIndex, handleFullSearch, handleSelectSuggestion, items],
    );

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'ArrowDown') {
                if (status === 'success' && items.length > 0) {
                    event.preventDefault();
                    if (!isOpen) {
                        setIsOpen(true);
                        setActiveIndex(0);
                    } else {
                        setActiveIndex((prev) =>
                            prev < items.length - 1 ? prev + 1 : 0,
                        );
                    }
                }
                return;
            }

            if (event.key === 'ArrowUp') {
                if (status === 'success' && items.length > 0) {
                    event.preventDefault();
                    if (!isOpen) {
                        setIsOpen(true);
                        setActiveIndex(items.length - 1);
                    } else {
                        setActiveIndex((prev) =>
                            prev > 0 ? prev - 1 : items.length - 1,
                        );
                    }
                }
                return;
            }

            if (event.key === 'Escape') {
                if (showPanel) {
                    event.preventDefault();
                    event.stopPropagation();
                    cancelPending();
                    setIsOpen(false);
                    setActiveIndex(-1);
                    return;
                }

                if (onCloseOverlay) {
                    event.preventDefault();
                    onCloseOverlay();
                }
                return;
            }

            if (event.key === 'Tab') {
                cancelPending();
                setIsOpen(false);
                setActiveIndex(-1);
            }
        },
        [
            cancelPending,
            isOpen,
            items.length,
            onCloseOverlay,
            setIsOpen,
            showPanel,
            status,
        ],
    );

    const liveAnnouncement = (() => {
        if (status === 'waiting') {
            return 'Buscando em instantes…';
        }
        if (status === 'loading') {
            return 'Carregando sugestões de produtos…';
        }
        if (status === 'error') {
            return errorMessage ?? 'Erro ao carregar sugestões.';
        }
        if (status === 'success') {
            if (items.length === 0) {
                return `Nenhum resultado sugerido para "${trimmedQuery}". Opção de busca avançada disponível.`;
            }
            return total === 1
                ? `1 produto encontrado para "${trimmedQuery}". Use as setas para navegar.`
                : `${items.length} sugestões exibidas de ${total} resultados para "${trimmedQuery}". Use as setas para navegar.`;
        }
        return '';
    })();

    return (
        <div
            ref={containerRef}
            className={cn('relative w-full min-w-0', className)}
        >
            <form
                role="search"
                aria-label="Buscar produtos no catálogo"
                onSubmit={handleFormSubmit}
                className="flex w-full min-w-0 items-center gap-2"
            >
                <Label htmlFor={inputId} className="sr-only">
                    Buscar produtos no catálogo
                </Label>

                <div className="relative flex min-w-0 flex-1 items-center">
                    <Search
                        className="pointer-events-none absolute left-3 size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                    />

                    <Input
                        ref={inputRef}
                        id={inputId}
                        type="search"
                        name="q"
                        value={query}
                        onChange={(event) => {
                            setActiveIndex(-1);
                            handleQueryChange(event.target.value);
                        }}
                        onFocus={() => {
                            if (
                                status === 'success' &&
                                trimmedQuery.length >= 2
                            ) {
                                setIsOpen(true);
                            }
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        autoComplete="off"
                        autoFocus={autoFocus}
                        role="combobox"
                        aria-autocomplete="list"
                        aria-haspopup="listbox"
                        aria-expanded={showPanel}
                        aria-controls={listboxId}
                        aria-activedescendant={activeDescendantId}
                        aria-describedby={statusLiveId}
                        className={cn(
                            'pl-9 [&::-webkit-search-cancel-button]:hidden',
                            variant === 'desktop'
                                ? query
                                    ? 'pr-32'
                                    : 'pr-24'
                                : query
                                  ? 'pr-12'
                                  : 'pr-3',
                        )}
                    />

                    {query.length > 0 && (
                        <button
                            type="button"
                            onClick={() => {
                                clearSearch();
                                setActiveIndex(-1);
                                inputRef.current?.focus();
                            }}
                            aria-label="Limpar termo de busca"
                            className={cn(
                                'inline-flex size-11 min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 ease-out hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none',
                                variant === 'desktop'
                                    ? 'absolute right-20'
                                    : 'absolute right-0',
                            )}
                        >
                            <X className="size-4" aria-hidden="true" />
                        </button>
                    )}

                    {variant === 'desktop' && (
                        <StoreButton
                            type="submit"
                            variant="secondary"
                            size="sm"
                            className="absolute right-1.5 min-h-9 px-3 text-xs font-semibold"
                        >
                            Buscar
                        </StoreButton>
                    )}
                </div>

                {variant === 'mobile' && (
                    <StoreButton
                        type="submit"
                        variant="default"
                        size="touch"
                        className="shrink-0 px-3.5"
                    >
                        Buscar
                    </StoreButton>
                )}
            </form>

            {/* Região aria-live="polite" para leitores de tela */}
            <div
                id={statusLiveId}
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
            >
                {liveAnnouncement}
            </div>

            {/* Painel de sugestões do combobox */}
            {showPanel && (
                <div
                    className={cn(
                        'z-50 w-full max-w-full overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg transition-opacity duration-150 ease-out motion-reduce:transition-none',
                        variant === 'desktop'
                            ? 'absolute top-full right-0 left-0 mt-1.5 max-h-[min(30rem,calc(100vh-5rem))] overflow-y-auto'
                            : 'mt-2 max-h-[calc(100vh-9rem)] overflow-y-auto',
                    )}
                >
                    {/* Listbox sempre presente quando aria-expanded="true" para conformidade ARIA 1.2 */}
                    <ul
                        id={listboxId}
                        role="listbox"
                        aria-label="Sugestões de produtos"
                        className={cn(
                            'divide-y divide-border/60',
                            (status !== 'success' || items.length === 0) &&
                                'sr-only',
                        )}
                    >
                        {status === 'success' &&
                            items.map((item, index) => {
                                const isActive = effectiveActiveIndex === index;

                                return (
                                    <li
                                        key={item.id}
                                        id={`${listboxId}-option-${index}`}
                                        role="option"
                                        aria-selected={isActive}
                                        onMouseEnter={() =>
                                            setActiveIndex(index)
                                        }
                                        onClick={() =>
                                            handleSelectSuggestion(item)
                                        }
                                        className={cn(
                                            'flex min-h-14 cursor-pointer items-center gap-3 px-3.5 py-2.5 transition-colors duration-150 ease-out motion-reduce:transition-none',
                                            isActive
                                                ? 'bg-accent text-accent-foreground'
                                                : 'hover:bg-accent/60',
                                        )}
                                    >
                                        <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted/50">
                                            {item.imageUrl ? (
                                                <img
                                                    src={item.imageUrl}
                                                    alt={
                                                        item.imageAlt ||
                                                        item.name
                                                    }
                                                    width={44}
                                                    height={44}
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="size-full object-cover"
                                                />
                                            ) : (
                                                <Package
                                                    className="size-5 text-muted-foreground"
                                                    aria-hidden="true"
                                                />
                                            )}
                                        </div>

                                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                            <span className="truncate text-sm font-semibold text-foreground">
                                                {item.name}
                                            </span>
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                                <span className="truncate font-medium">
                                                    {item.brand}
                                                </span>
                                                {item.categoryName && (
                                                    <>
                                                        <span aria-hidden="true">
                                                            ·
                                                        </span>
                                                        <span className="truncate">
                                                            {item.categoryName}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <ArrowRight
                                            className="size-4 shrink-0 text-muted-foreground"
                                            aria-hidden="true"
                                        />
                                    </li>
                                );
                            })}
                    </ul>

                    {/* Estado 1: aguardando os 3 000 ms sem digitar */}
                    {status === 'waiting' && (
                        <div className="flex items-center justify-between gap-3 px-4 py-3.5 text-xs text-muted-foreground">
                            <span>Buscando em instantes…</span>
                            <span className="hidden text-[11px] sm:inline">
                                Pressione Enter para buscar agora
                            </span>
                        </div>
                    )}

                    {/* Estado 2: requisição em andamento (skeleton discreto, sem spinner pulsante exagerado) */}
                    {status === 'loading' && (
                        <div
                            aria-busy="true"
                            aria-label="Carregando sugestões"
                            className="divide-y divide-border/60"
                        >
                            {Array.from({ length: 3 }, (_, idx) => (
                                <div
                                    key={idx}
                                    className="flex min-h-14 items-center gap-3 px-3.5 py-2.5"
                                >
                                    <Skeleton className="size-11 shrink-0 rounded-md" />
                                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Estado 3: sem resultados */}
                    {status === 'success' && items.length === 0 && (
                        <div className="px-4 py-4 text-sm text-muted-foreground">
                            Nenhum produto encontrado para{' '}
                            <span className="font-semibold text-foreground">
                                “{trimmedQuery}”
                            </span>
                            .
                        </div>
                    )}

                    {/* Estado 4: erro de rede com recuperação */}
                    {status === 'error' && (
                        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                            <div className="flex items-center gap-2 text-sm text-foreground">
                                <AlertCircle
                                    className="size-4 shrink-0 text-destructive"
                                    aria-hidden="true"
                                />
                                <span>
                                    {errorMessage ??
                                        'Não foi possível carregar as sugestões.'}
                                </span>
                            </div>
                            <StoreButton
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={retrySuggestions}
                                className="min-h-11"
                            >
                                <RotateCcw
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                                <span>Tentar de novo</span>
                            </StoreButton>
                        </div>
                    )}

                    {/* Rodapé do painel: botão "Busca avançada" + contagem total quando houver mais resultados */}
                    {(status === 'success' || status === 'error') && (
                        <div className="border-t border-border bg-muted/40 p-2">
                            <button
                                type="button"
                                onClick={handleFullSearch}
                                className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-foreground transition-colors duration-150 ease-out hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
                            >
                                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                    <span>Busca avançada</span>
                                    {status === 'success' &&
                                        total > items.length && (
                                            <span className="text-xs font-normal text-muted-foreground tabular-nums">
                                                Ver todos os {total} resultados
                                            </span>
                                        )}
                                </div>
                                <ArrowRight
                                    className="size-4 shrink-0 text-muted-foreground"
                                    aria-hidden="true"
                                />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default SearchBox;
