import { useForm } from '@inertiajs/react';
import { Check, Info } from 'lucide-react';
import {
    useCallback,
    useEffect,
    useId,
    useRef,
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react';
import { StoreButton } from '@/components/button';
import { FormField } from '@/components/form-field';
import InputError from '@/components/input-error';
import { storeToast } from '@/components/toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { AddressFormData } from '@/types/checkout';
import type {
    AddressFormProps,
    BrazilianStateOption,
    CepLookupPayload,
    CepLookupState,
} from '@/types/checkout-ui';

const CEP_LOOKUP_DEBOUNCE_MS = 180;
const CEP_LOOKUP_TIMEOUT_MS = 8000;

export const BRAZILIAN_STATES: readonly BrazilianStateOption[] = [
    { code: 'AC', name: 'Acre' },
    { code: 'AL', name: 'Alagoas' },
    { code: 'AP', name: 'Amapá' },
    { code: 'AM', name: 'Amazonas' },
    { code: 'BA', name: 'Bahia' },
    { code: 'CE', name: 'Ceará' },
    { code: 'DF', name: 'Distrito Federal' },
    { code: 'ES', name: 'Espírito Santo' },
    { code: 'GO', name: 'Goiás' },
    { code: 'MA', name: 'Maranhão' },
    { code: 'MT', name: 'Mato Grosso' },
    { code: 'MS', name: 'Mato Grosso do Sul' },
    { code: 'MG', name: 'Minas Gerais' },
    { code: 'PA', name: 'Pará' },
    { code: 'PB', name: 'Paraíba' },
    { code: 'PR', name: 'Paraná' },
    { code: 'PE', name: 'Pernambuco' },
    { code: 'PI', name: 'Piauí' },
    { code: 'RJ', name: 'Rio de Janeiro' },
    { code: 'RN', name: 'Rio Grande do Norte' },
    { code: 'RS', name: 'Rio Grande do Sul' },
    { code: 'RO', name: 'Rondônia' },
    { code: 'RR', name: 'Roraima' },
    { code: 'SC', name: 'Santa Catarina' },
    { code: 'SP', name: 'São Paulo' },
    { code: 'SE', name: 'Sergipe' },
    { code: 'TO', name: 'Tocantins' },
] as const;

const VALID_STATE_CODES = new Set(BRAZILIAN_STATES.map((item) => item.code));

export function extractCepDigits(value: string): string {
    return value.replace(/\D/g, '').slice(0, 8);
}

export function formatCepMask(value: string): string {
    const digits = extractCepDigits(value);
    if (digits.length <= 5) {
        return digits;
    }

    return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
}

/**
 * Formulário de endereço corporativo (cadastro rápido inline ou em Sheet para novo/edição):
 * - Máscara de CEP `00000-000` (apenas dígitos aceitos).
 * - Consulta automática de CEP ao completar 8 dígitos com timeout de 8s,
 *   cancelamento de requisições anteriores e guarda contra respostas atrasadas.
 * - Sucesso preenche logradouro, bairro, cidade e UF (mantendo todos editáveis) e foca o número.
 * - Falha/timeout exibe aviso discreto "Não encontramos o CEP. Preencha manualmente." sem bloquear.
 */
export function AddressForm({
    mode,
    actionUrl,
    method,
    cepLookupUrl,
    initialAddress = null,
    onSuccess,
    onCancel,
}: AddressFormProps) {
    const stateSelectId = useId();
    const stateErrorId = `${stateSelectId}-error`;
    const cepStatusId = useId();
    const numberFieldId = useId();

    const numberInputRef = useRef<HTMLInputElement | null>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const lookupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const requestSeqRef = useRef(0);
    const latestCepDigitsRef = useRef(
        extractCepDigits(initialAddress?.cep ?? ''),
    );
    const lastLookedUpDigitsRef = useRef(
        extractCepDigits(initialAddress?.cep ?? ''),
    );

    const [cepLookupState, setCepLookupState] =
        useState<CepLookupState>('idle');

    const { data, setData, post, put, processing, errors, clearErrors, reset } =
        useForm<AddressFormData>({
            label: initialAddress?.label ?? '',
            cep: formatCepMask(initialAddress?.cep ?? ''),
            street: initialAddress?.street ?? '',
            number: initialAddress?.number ?? '',
            complement: initialAddress?.complement ?? '',
            neighborhood: initialAddress?.neighborhood ?? '',
            city: initialAddress?.city ?? '',
            state: initialAddress?.state ?? '',
        });

    const cancelPendingLookup = useCallback(() => {
        if (debounceTimerRef.current !== null) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
        if (lookupTimeoutRef.current !== null) {
            clearTimeout(lookupTimeoutRef.current);
            lookupTimeoutRef.current = null;
        }
        if (abortControllerRef.current !== null) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            cancelPendingLookup();
        };
    }, [cancelPendingLookup]);

    const performCepLookup = useCallback(
        async (digits: string) => {
            cancelPendingLookup();

            const currentSeq = requestSeqRef.current + 1;
            requestSeqRef.current = currentSeq;
            lastLookedUpDigitsRef.current = digits;

            const controller = new AbortController();
            abortControllerRef.current = controller;

            lookupTimeoutRef.current = setTimeout(() => {
                controller.abort();
            }, CEP_LOOKUP_TIMEOUT_MS);

            setCepLookupState('loading');

            try {
                const response = await fetch(`${cepLookupUrl}/${digits}`, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                    },
                    signal: controller.signal,
                });

                if (
                    requestSeqRef.current !== currentSeq ||
                    latestCepDigitsRef.current !== digits
                ) {
                    return;
                }

                if (!response.ok) {
                    setCepLookupState('fallback');
                    return;
                }

                const payload =
                    (await response.json()) as Partial<CepLookupPayload>;

                if (
                    requestSeqRef.current !== currentSeq ||
                    latestCepDigitsRef.current !== digits
                ) {
                    return;
                }

                const normalizedState = (payload.state ?? '')
                    .trim()
                    .toUpperCase();
                const validState = VALID_STATE_CODES.has(normalizedState)
                    ? normalizedState
                    : '';

                setData((previous) => ({
                    ...previous,
                    cep: formatCepMask(payload.cep ?? digits),
                    street:
                        typeof payload.street === 'string' &&
                        payload.street.trim() !== ''
                            ? payload.street.trim()
                            : previous.street,
                    neighborhood:
                        typeof payload.neighborhood === 'string' &&
                        payload.neighborhood.trim() !== ''
                            ? payload.neighborhood.trim()
                            : previous.neighborhood,
                    city:
                        typeof payload.city === 'string' &&
                        payload.city.trim() !== ''
                            ? payload.city.trim()
                            : previous.city,
                    state: validState || previous.state,
                }));

                clearErrors('cep', 'street', 'neighborhood', 'city', 'state');
                setCepLookupState('resolved');

                requestAnimationFrame(() => {
                    numberInputRef.current?.focus();
                });
            } catch {
                if (
                    requestSeqRef.current !== currentSeq ||
                    latestCepDigitsRef.current !== digits
                ) {
                    return;
                }
                setCepLookupState('fallback');
            } finally {
                if (lookupTimeoutRef.current !== null) {
                    clearTimeout(lookupTimeoutRef.current);
                    lookupTimeoutRef.current = null;
                }
                if (abortControllerRef.current === controller) {
                    abortControllerRef.current = null;
                }
            }
        },
        [cancelPendingLookup, cepLookupUrl, clearErrors, setData],
    );

    const handleCepChange = (event: ChangeEvent<HTMLInputElement>) => {
        const digits = extractCepDigits(event.target.value);
        const masked = formatCepMask(digits);

        latestCepDigitsRef.current = digits;
        setData('cep', masked);

        if (errors.cep) {
            clearErrors('cep');
        }

        if (digits.length < 8) {
            cancelPendingLookup();
            requestSeqRef.current += 1;
            lastLookedUpDigitsRef.current = '';
            if (cepLookupState !== 'idle') {
                setCepLookupState('idle');
            }
            return;
        }

        if (
            digits === lastLookedUpDigitsRef.current &&
            cepLookupState !== 'idle'
        ) {
            return;
        }

        cancelPendingLookup();
        debounceTimerRef.current = setTimeout(() => {
            void performCepLookup(digits);
        }, CEP_LOOKUP_DEBOUNCE_MS);
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const submitFn = method === 'put' ? put : post;

        submitFn(actionUrl, {
            preserveScroll: true,
            onSuccess: () => {
                if (method === 'post' && mode === 'sheet') {
                    reset();
                }
                storeToast.success(
                    method === 'put'
                        ? 'Endereço de entrega atualizado.'
                        : 'Endereço cadastrado para a entrega.',
                );
                onSuccess?.();
            },
        });
    };

    const isEditing = method === 'put';

    return (
        <form
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-4"
        >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                {/* Apelido opcional (ex.: Matriz, Filial, Depósito) */}
                <div className="sm:col-span-7">
                    <FormField
                        label="Identificação do local"
                        name="label"
                        optional
                        optionalLabel="Opcional"
                        maxLength={60}
                        autoComplete="off"
                        placeholder="Ex.: Matriz, Depósito Central, Obra"
                        value={data.label}
                        onChange={(e) => {
                            setData('label', e.target.value);
                            if (errors.label) {
                                clearErrors('label');
                            }
                        }}
                        error={errors.label}
                    />
                </div>

                {/* CEP com máscara e busca automática */}
                <div className="sm:col-span-5">
                    <FormField
                        label="CEP"
                        name="cep"
                        type="text"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        placeholder="00000-000"
                        maxLength={9}
                        required
                        value={data.cep}
                        onChange={handleCepChange}
                        aria-describedby={
                            cepLookupState === 'fallback' ||
                            cepLookupState === 'loading'
                                ? cepStatusId
                                : undefined
                        }
                        endAdornment={
                            cepLookupState === 'loading' ? (
                                <Spinner
                                    aria-label="Consultando CEP"
                                    className="size-4 text-muted-foreground"
                                />
                            ) : cepLookupState === 'resolved' ? (
                                <Check
                                    aria-hidden="true"
                                    className="size-4 text-success"
                                />
                            ) : undefined
                        }
                        error={errors.cep}
                        className="font-mono tabular-nums"
                    />
                </div>
            </div>

            {/* Aviso discreto quando o CEP não é encontrado ou o serviço expira */}
            {cepLookupState === 'loading' && (
                <p
                    id={cepStatusId}
                    role="status"
                    aria-live="polite"
                    className="text-xs text-muted-foreground"
                >
                    Consultando endereço pelo CEP...
                </p>
            )}

            {cepLookupState === 'fallback' && (
                <div
                    id={cepStatusId}
                    role="status"
                    aria-live="polite"
                    className="flex items-start gap-2 rounded-md border border-border bg-muted/60 px-3 py-2 text-xs text-muted-foreground"
                >
                    <Info
                        className="mt-0.5 size-3.5 shrink-0 text-foreground/75"
                        aria-hidden="true"
                    />
                    <span>Não encontramos o CEP. Preencha manualmente.</span>
                </div>
            )}

            {/* Logradouro + Número */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                <div className="sm:col-span-8">
                    <FormField
                        label="Logradouro"
                        name="street"
                        autoComplete="street-address"
                        placeholder="Rua, avenida, rodovia ou alameda"
                        maxLength={255}
                        required
                        value={data.street}
                        onChange={(e) => {
                            setData('street', e.target.value);
                            if (errors.street) {
                                clearErrors('street');
                            }
                        }}
                        error={errors.street}
                    />
                </div>

                <div className="sm:col-span-4">
                    <FormField
                        id={numberFieldId}
                        label="Número"
                        name="number"
                        error={errors.number}
                    >
                        <Input
                            ref={numberInputRef}
                            id={numberFieldId}
                            name="number"
                            type="text"
                            autoComplete="address-line2"
                            placeholder='Ex.: 1200 ou "s/n"'
                            maxLength={20}
                            required
                            value={data.number}
                            onChange={(e) => {
                                setData('number', e.target.value);
                                if (errors.number) {
                                    clearErrors('number');
                                }
                            }}
                            aria-invalid={Boolean(errors.number) || undefined}
                            aria-describedby={
                                errors.number
                                    ? `${numberFieldId}-error`
                                    : undefined
                            }
                        />
                    </FormField>
                </div>
            </div>

            {/* Complemento + Bairro */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                <div className="sm:col-span-6">
                    <FormField
                        label="Complemento"
                        name="complement"
                        optional
                        optionalLabel="Opcional"
                        autoComplete="address-line3"
                        placeholder="Galpão, doca, sala, bloco"
                        maxLength={255}
                        value={data.complement}
                        onChange={(e) => {
                            setData('complement', e.target.value);
                            if (errors.complement) {
                                clearErrors('complement');
                            }
                        }}
                        error={errors.complement}
                    />
                </div>

                <div className="sm:col-span-6">
                    <FormField
                        label="Bairro / Distrito industrial"
                        name="neighborhood"
                        autoComplete="address-level3"
                        placeholder="Bairro ou distrito"
                        maxLength={255}
                        required
                        value={data.neighborhood}
                        onChange={(e) => {
                            setData('neighborhood', e.target.value);
                            if (errors.neighborhood) {
                                clearErrors('neighborhood');
                            }
                        }}
                        error={errors.neighborhood}
                    />
                </div>
            </div>

            {/* Cidade + UF (Select das 27 UFs) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                <div className="sm:col-span-7">
                    <FormField
                        label="Cidade"
                        name="city"
                        autoComplete="address-level2"
                        placeholder="Município"
                        maxLength={255}
                        required
                        value={data.city}
                        onChange={(e) => {
                            setData('city', e.target.value);
                            if (errors.city) {
                                clearErrors('city');
                            }
                        }}
                        error={errors.city}
                    />
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-5">
                    <Label
                        htmlFor={stateSelectId}
                        className="text-sm leading-snug font-medium text-foreground"
                    >
                        UF (Estado)
                    </Label>
                    <input
                        type="hidden"
                        name="state"
                        autoComplete="address-level1"
                        value={data.state}
                    />
                    <Select
                        value={data.state || undefined}
                        onValueChange={(value) => {
                            setData('state', value);
                            if (errors.state) {
                                clearErrors('state');
                            }
                        }}
                    >
                        <SelectTrigger
                            id={stateSelectId}
                            aria-invalid={Boolean(errors.state) || undefined}
                            aria-describedby={
                                errors.state ? stateErrorId : undefined
                            }
                            className="min-h-11 w-full bg-background text-base md:text-sm"
                        >
                            <SelectValue placeholder="Selecione a UF" />
                        </SelectTrigger>
                        <SelectContent>
                            {BRAZILIAN_STATES.map((uf) => (
                                <SelectItem
                                    key={uf.code}
                                    value={uf.code}
                                    className="min-h-10"
                                >
                                    {uf.code} — {uf.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError id={stateErrorId} message={errors.state} />
                </div>
            </div>

            {/* Rodapé de ações do formulário */}
            <div
                className={cn(
                    'flex flex-wrap items-center justify-end gap-2.5 pt-2',
                    mode === 'sheet' && 'border-t border-border pt-4',
                )}
            >
                {onCancel && (
                    <StoreButton
                        type="button"
                        variant="outline"
                        size="touch"
                        disabled={processing}
                        onClick={onCancel}
                    >
                        Cancelar
                    </StoreButton>
                )}

                <StoreButton
                    type="submit"
                    variant="default"
                    size="touch"
                    loading={processing}
                    loadingText={
                        isEditing
                            ? 'Salvando alterações...'
                            : 'Salvando endereço...'
                    }
                    className={cn(
                        'font-semibold',
                        mode === 'inline' && 'w-full sm:w-auto',
                    )}
                >
                    {isEditing
                        ? 'Salvar alterações'
                        : mode === 'inline'
                          ? 'Salvar endereço e calcular frete'
                          : 'Salvar endereço'}
                </StoreButton>
            </div>
        </form>
    );
}

export default AddressForm;
