import { router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import searchRoutes from '@/routes/search';
import type { SearchSuggestion, SuggestResponse } from '@/types/search';

/**
 * Regra de negócio (D3/D11): consultar o endpoint de sugestões SOMENTE após
 * 3 000 ms ininterruptos sem digitar. Cada tecla pressionada zera a contagem.
 */
export const SEARCH_DEBOUNCE_MS = 3000;

/** Quantidade mínima de caracteres (após trim) para iniciar a contagem de sugestões. */
export const SEARCH_MIN_CHARS = 2;

/** Limite máximo de itens exibidos no painel de sugestões. */
export const SEARCH_MAX_SUGGESTIONS = 5;

export type DebouncedSearchStatus =
    | 'idle'
    | 'waiting'
    | 'loading'
    | 'success'
    | 'error';

export type SearchDebounceController = {
    /**
     * Agenda a execução após `delayMs` ininterruptos.
     * Toda chamada cancela imediatamente o timer anterior e aborta qualquer requisição em andamento.
     */
    schedule: (
        rawTerm: string,
        onReady: (
            normalizedTerm: string,
            signal: AbortSignal,
            requestId: number,
        ) => void,
    ) => { scheduled: boolean; normalizedTerm: string };
    /**
     * Executa imediatamente (ex.: botão "Tentar de novo"), cancelando timers/requisições anteriores.
     */
    executeNow: (
        rawTerm: string,
        onReady: (
            normalizedTerm: string,
            signal: AbortSignal,
            requestId: number,
        ) => void,
    ) => { executed: boolean; normalizedTerm: string };
    /**
     * Cancela o timer de 3 s pendente e aborta qualquer requisição em andamento.
     */
    cancel: () => void;
    /** Verifica se o `requestId` ainda corresponde à consulta mais recente. */
    isCurrentRequest: (requestId: number) => boolean;
    /** Informa se há um timer aguardando disparo. */
    hasPendingTimer: () => boolean;
};

export type CreateSearchDebounceControllerOptions = {
    delayMs?: number;
    minChars?: number;
};

export function normalizeSearchQuery(value: string): string {
    return value.trim();
}

export function hasMinimumSearchLength(
    value: string,
    minChars: number = SEARCH_MIN_CHARS,
): boolean {
    return normalizeSearchQuery(value).length >= minChars;
}

/**
 * Fábrica pura e isolada de controle de tempo (3 000 ms) + AbortController.
 * Separada do ciclo de vida do React para permitir testes determinísticos com timers falsos:
 * - Várias chamadas a `schedule` dentro da janela de 3 000 ms zeram o `setTimeout` anterior e disparam apenas 1 vez após 3 000 ms da última tecla.
 * - Termo curto (< 2 caracteres após trim) ou chamada a `cancel()` (ex.: Enter / botão Buscar / limpar) zera o timer e aborta o `AbortController` ativo.
 * - Nova consulta aborta a anterior e invalida respostas antigas via `requestId` monotônico.
 */
export function createSearchDebounceController(
    options: CreateSearchDebounceControllerOptions = {},
): SearchDebounceController {
    const delayMs = options.delayMs ?? SEARCH_DEBOUNCE_MS;
    const minChars = options.minChars ?? SEARCH_MIN_CHARS;

    let timerId: ReturnType<typeof setTimeout> | null = null;
    let activeAbortController: AbortController | null = null;
    let currentRequestId = 0;

    const clearTimer = (): void => {
        if (timerId !== null) {
            clearTimeout(timerId);
            timerId = null;
        }
    };

    const abortInFlight = (): void => {
        if (activeAbortController !== null) {
            activeAbortController.abort();
            activeAbortController = null;
        }
    };

    const cancel = (): void => {
        currentRequestId += 1;
        clearTimer();
        abortInFlight();
    };

    const schedule: SearchDebounceController['schedule'] = (
        rawTerm,
        onReady,
    ) => {
        cancel();

        const normalizedTerm = normalizeSearchQuery(rawTerm);

        if (normalizedTerm.length < minChars) {
            return { scheduled: false, normalizedTerm };
        }

        const scheduledRequestId = currentRequestId;

        timerId = setTimeout(() => {
            timerId = null;

            if (scheduledRequestId !== currentRequestId) {
                return;
            }

            const controller = new AbortController();
            activeAbortController = controller;

            onReady(normalizedTerm, controller.signal, scheduledRequestId);
        }, delayMs);

        return { scheduled: true, normalizedTerm };
    };

    const executeNow: SearchDebounceController['executeNow'] = (
        rawTerm,
        onReady,
    ) => {
        cancel();

        const normalizedTerm = normalizeSearchQuery(rawTerm);

        if (normalizedTerm.length < minChars) {
            return { executed: false, normalizedTerm };
        }

        const requestId = currentRequestId;
        const controller = new AbortController();
        activeAbortController = controller;

        onReady(normalizedTerm, controller.signal, requestId);

        return { executed: true, normalizedTerm };
    };

    return {
        schedule,
        executeNow,
        cancel,
        isCurrentRequest: (requestId: number) => requestId === currentRequestId,
        hasPendingTimer: () => timerId !== null,
    };
}

export type UseDebouncedSearchOptions = {
    initialQuery?: string;
    delayMs?: number;
    minChars?: number;
    fetcher?: (
        normalizedQuery: string,
        signal: AbortSignal,
    ) => Promise<SuggestResponse>;
    onNavigate?: (url: string) => void;
};

export type UseDebouncedSearchReturn = {
    query: string;
    trimmedQuery: string;
    status: DebouncedSearchStatus;
    items: SearchSuggestion[];
    total: number;
    errorMessage: string | null;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    handleQueryChange: (nextValue: string) => void;
    clearSearch: () => void;
    retrySuggestions: () => void;
    submitSearch: (overrideQuery?: string) => void;
    cancelPending: () => void;
};

async function defaultSuggestFetcher(
    normalizedQuery: string,
    signal: AbortSignal,
): Promise<SuggestResponse> {
    const url = searchRoutes.suggest.url({
        query: { q: normalizedQuery },
    });

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        signal,
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    return (await response.json()) as SuggestResponse;
}

export function useDebouncedSearch(
    options: UseDebouncedSearchOptions = {},
): UseDebouncedSearchReturn {
    const {
        initialQuery = '',
        delayMs = SEARCH_DEBOUNCE_MS,
        minChars = SEARCH_MIN_CHARS,
        fetcher = defaultSuggestFetcher,
        onNavigate,
    } = options;

    const [query, setQuery] = useState<string>(initialQuery);
    const [lastSyncedInitialQuery, setLastSyncedInitialQuery] =
        useState<string>(initialQuery);
    const [status, setStatus] = useState<DebouncedSearchStatus>('idle');
    const [items, setItems] = useState<SearchSuggestion[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const controllerRef = useRef<SearchDebounceController | null>(null);

    const getController = useCallback((): SearchDebounceController => {
        if (controllerRef.current === null) {
            controllerRef.current = createSearchDebounceController({
                delayMs,
                minChars,
            });
        }

        return controllerRef.current;
    }, [delayMs, minChars]);

    // Sincroniza o input quando a prop `initialQuery` muda após navegação Inertia, sem disparar sugestões.
    if (initialQuery !== lastSyncedInitialQuery) {
        setLastSyncedInitialQuery(initialQuery);
        setQuery(initialQuery);
        setStatus('idle');
        setItems([]);
        setTotal(0);
        setErrorMessage(null);
        setIsOpen(false);
    }

    useEffect(() => {
        controllerRef.current?.cancel();
    }, [initialQuery]);

    useEffect(() => {
        return () => {
            controllerRef.current?.cancel();
        };
    }, []);

    const runSuggestionRequest = useCallback(
        (
            normalizedTerm: string,
            signal: AbortSignal,
            requestId: number,
        ): void => {
            const controller = getController();
            setStatus('loading');
            setErrorMessage(null);

            void fetcher(normalizedTerm, signal)
                .then((data) => {
                    if (
                        signal.aborted ||
                        !controller.isCurrentRequest(requestId)
                    ) {
                        return;
                    }

                    const safeItems = Array.isArray(data.items)
                        ? data.items.slice(0, SEARCH_MAX_SUGGESTIONS)
                        : [];
                    const safeTotal =
                        typeof data.total === 'number'
                            ? data.total
                            : safeItems.length;

                    setItems(safeItems);
                    setTotal(safeTotal);
                    setStatus('success');
                    setErrorMessage(null);
                })
                .catch((error: unknown) => {
                    if (
                        signal.aborted ||
                        (error instanceof DOMException &&
                            error.name === 'AbortError') ||
                        (error instanceof Error &&
                            error.name === 'AbortError') ||
                        !controller.isCurrentRequest(requestId)
                    ) {
                        return;
                    }

                    setItems([]);
                    setTotal(0);
                    setStatus('error');
                    setErrorMessage(
                        'Não foi possível carregar as sugestões agora.',
                    );
                });
        },
        [fetcher, getController],
    );

    const handleQueryChange = useCallback(
        (nextValue: string): void => {
            setQuery(nextValue);

            const controller = getController();
            const { scheduled } = controller.schedule(
                nextValue,
                runSuggestionRequest,
            );

            if (!scheduled) {
                setStatus('idle');
                setItems([]);
                setTotal(0);
                setErrorMessage(null);
                setIsOpen(false);
                return;
            }

            setStatus('waiting');
            setErrorMessage(null);
            setIsOpen(true);
        },
        [getController, runSuggestionRequest],
    );

    const cancelPending = useCallback((): void => {
        controllerRef.current?.cancel();
        setStatus((prev) =>
            prev === 'waiting' || prev === 'loading' ? 'idle' : prev,
        );
    }, []);

    const clearSearch = useCallback((): void => {
        controllerRef.current?.cancel();
        setQuery('');
        setStatus('idle');
        setItems([]);
        setTotal(0);
        setErrorMessage(null);
        setIsOpen(false);
    }, []);

    const retrySuggestions = useCallback((): void => {
        const controller = getController();
        const { executed } = controller.executeNow(query, runSuggestionRequest);
        if (executed) {
            setIsOpen(true);
        }
    }, [getController, query, runSuggestionRequest]);

    const submitSearch = useCallback(
        (overrideQuery?: string): void => {
            controllerRef.current?.cancel();
            setStatus('idle');
            setErrorMessage(null);
            setIsOpen(false);

            const q = normalizeSearchQuery(overrideQuery ?? query);
            const targetUrl = searchRoutes.index.url({
                query: q ? { q } : {},
            });

            if (onNavigate) {
                onNavigate(targetUrl);
                return;
            }

            router.get(targetUrl);
        },
        [onNavigate, query],
    );

    return {
        query,
        trimmedQuery: normalizeSearchQuery(query),
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
    };
}

export default useDebouncedSearch;
