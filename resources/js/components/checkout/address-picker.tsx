import { router } from '@inertiajs/react';
import { Building2, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useId, useState } from 'react';
import { StoreButton } from '@/components/button';
import { AddressForm } from '@/components/checkout/address-form';
import { storeToast } from '@/components/toast';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { AddressData } from '@/types/checkout';
import type { AddressPickerProps } from '@/types/checkout-ui';

function getAddressDisplayName(address: AddressData): string {
    if (address.label && address.label.trim() !== '') {
        return address.label.trim();
    }

    return `${address.street}, ${address.number}`;
}

/**
 * Seleção e gerenciamento inline de endereços da empresa (Onda 6 - item 6.1):
 * - Sem endereços cadastrados: exibe formulário de cadastro rápido diretamente na tela (sem navegação).
 * - Com endereços: grupo de radio acessível com o último usado pré-selecionado,
 *   ação "Novo endereço" em Sheet (drawer) e ações de editar (Sheet) e remover (Dialog).
 * - Sem aninhamento de card dentro de card e com alvos de toque >= 44px.
 */
export function AddressPicker({
    addresses,
    selectedAddressId,
    isSwitchingAddress,
    addressStoreUrl,
    addressBaseUrl,
    cepLookupUrl,
    onSelectAddress,
}: AddressPickerProps) {
    const headingId = useId();
    const radioGroupName = useId();

    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState<AddressData | null>(
        null,
    );
    const [addressToDelete, setAddressToDelete] = useState<AddressData | null>(
        null,
    );
    const [isDeleting, setIsDeleting] = useState(false);

    const handleOpenCreateSheet = useCallback(() => {
        setEditingAddress(null);
        setSheetOpen(true);
    }, []);

    const handleOpenEditSheet = useCallback((address: AddressData) => {
        setEditingAddress(address);
        setSheetOpen(true);
    }, []);

    const handleCloseSheet = useCallback(() => {
        setSheetOpen(false);
        setEditingAddress(null);
    }, []);

    const handleConfirmDelete = useCallback(() => {
        if (!addressToDelete || isDeleting) {
            return;
        }

        const target = addressToDelete;
        const displayName = getAddressDisplayName(target);
        setIsDeleting(true);

        router.delete(`${addressBaseUrl}/${target.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setAddressToDelete(null);
                storeToast.info(`Endereço "${displayName}" removido.`);
            },
            onError: () => {
                storeToast.error(
                    'Não foi possível remover este endereço. Tente novamente.',
                );
            },
            onFinish: () => {
                setIsDeleting(false);
            },
        });
    }, [addressBaseUrl, addressToDelete, isDeleting]);

    // Caso 1: Empresa ainda não possui endereço cadastrado -> formulário inline direto na tela
    if (addresses.length === 0) {
        return (
            <section
                aria-labelledby={headingId}
                className="flex flex-col gap-4"
            >
                <div className="flex flex-col gap-1">
                    <h2
                        id={headingId}
                        className="text-fluid-xl font-semibold tracking-tight text-foreground"
                    >
                        Endereço de entrega
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Cadastre o primeiro endereço comercial da sua empresa
                        para calcular o frete desta entrega.
                    </p>
                </div>

                <div className="rounded-lg border border-border bg-card p-5 text-card-foreground sm:p-6">
                    <AddressForm
                        mode="inline"
                        method="post"
                        actionUrl={addressStoreUrl}
                        cepLookupUrl={cepLookupUrl}
                    />
                </div>
            </section>
        );
    }

    // Caso 2: Empresa já possui endereços cadastrados -> lista em radio acessível + Sheet para novo/editar
    return (
        <section aria-labelledby={headingId} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <h2
                        id={headingId}
                        className="text-fluid-xl font-semibold tracking-tight text-foreground"
                    >
                        Endereço de entrega
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Escolha o local de recebimento da sua empresa ou
                        cadastre uma nova unidade.
                    </p>
                </div>

                <StoreButton
                    type="button"
                    variant="outline"
                    size="touch"
                    onClick={handleOpenCreateSheet}
                    className="font-semibold"
                >
                    <Plus className="size-4 shrink-0" aria-hidden="true" />
                    <span>Novo endereço</span>
                </StoreButton>
            </div>

            <div
                role="radiogroup"
                aria-labelledby={headingId}
                aria-busy={isSwitchingAddress || undefined}
                className="grid grid-cols-1 gap-3"
            >
                {addresses.map((address, index) => {
                    const isSelected = address.id === selectedAddressId;
                    const isLastUsed =
                        index === 0 && address.lastUsedAt !== null;
                    const radioId = `${radioGroupName}-address-${address.id}`;
                    const displayTitle = getAddressDisplayName(address);

                    return (
                        <div
                            key={address.id}
                            className={cn(
                                'flex flex-col justify-between gap-3 rounded-lg border bg-card p-4 text-card-foreground transition-colors duration-150 ease-out sm:flex-row sm:items-start sm:gap-4 sm:p-5',
                                'has-[input[type=radio]:focus-visible]:ring-2 has-[input[type=radio]:focus-visible]:ring-ring has-[input[type=radio]:focus-visible]:ring-offset-2 has-[input[type=radio]:focus-visible]:ring-offset-background',
                                isSelected
                                    ? 'border-brand bg-brand-muted/20'
                                    : 'border-border hover:border-foreground/30',
                            )}
                        >
                            <label
                                htmlFor={radioId}
                                className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-start gap-3.5"
                            >
                                <input
                                    id={radioId}
                                    type="radio"
                                    name={radioGroupName}
                                    value={address.id}
                                    checked={isSelected}
                                    onChange={() => onSelectAddress(address.id)}
                                    className="sr-only"
                                />

                                {/* Indicador visual do radio */}
                                <span
                                    aria-hidden="true"
                                    className={cn(
                                        'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-150 ease-out',
                                        isSelected
                                            ? 'border-brand bg-brand text-brand-foreground'
                                            : 'border-input bg-background',
                                    )}
                                >
                                    {isSelected && (
                                        <span className="size-2 rounded-full bg-brand-foreground" />
                                    )}
                                </span>

                                <div className="flex min-w-0 flex-1 flex-col gap-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center gap-1.5 text-base font-semibold text-foreground">
                                            {address.label ? (
                                                <Building2
                                                    className="size-4 shrink-0 text-muted-foreground"
                                                    aria-hidden="true"
                                                />
                                            ) : (
                                                <MapPin
                                                    className="size-4 shrink-0 text-muted-foreground"
                                                    aria-hidden="true"
                                                />
                                            )}
                                            <span>
                                                {address.label ||
                                                    `${address.street}, ${address.number}`}
                                            </span>
                                        </span>

                                        {isLastUsed && (
                                            <span className="inline-flex items-center rounded-sm border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                                                Último utilizado
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-sm leading-relaxed text-foreground/90">
                                        {address.street}, {address.number}
                                        {address.complement
                                            ? ` — ${address.complement}`
                                            : ''}
                                    </p>

                                    <p className="text-xs text-muted-foreground tabular-nums sm:text-sm">
                                        {address.neighborhood} · {address.city}/
                                        {address.state} · CEP {address.cep}
                                    </p>
                                </div>
                            </label>

                            {/* Ações secundárias por endereço (fora do <label> para HTML e a11y válidos) */}
                            <div className="flex shrink-0 items-center justify-end gap-1 border-t border-border/60 pt-2 sm:border-t-0 sm:pt-0">
                                <StoreButton
                                    type="button"
                                    variant="ghost"
                                    size="touch"
                                    onClick={() => handleOpenEditSheet(address)}
                                    aria-label={`Editar endereço ${displayTitle}`}
                                    className="h-11 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
                                >
                                    <Pencil
                                        className="size-3.5 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>Editar</span>
                                </StoreButton>

                                <StoreButton
                                    type="button"
                                    variant="ghost"
                                    size="touch"
                                    onClick={() => setAddressToDelete(address)}
                                    aria-label={`Remover endereço ${displayTitle}`}
                                    className="h-11 px-3 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                >
                                    <Trash2
                                        className="size-3.5 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>Remover</span>
                                </StoreButton>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Painel lateral (Sheet) para cadastrar novo endereço ou editar existente */}
            <Sheet
                open={sheetOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        handleCloseSheet();
                    } else {
                        setSheetOpen(true);
                    }
                }}
            >
                <SheetContent
                    side="right"
                    className="w-full overflow-y-auto p-5 sm:max-w-lg sm:p-6"
                >
                    <SheetHeader className="p-0 pb-2 text-left">
                        <SheetTitle className="text-fluid-lg font-semibold text-foreground">
                            {editingAddress
                                ? 'Editar endereço de entrega'
                                : 'Novo endereço de entrega'}
                        </SheetTitle>
                        <SheetDescription>
                            {editingAddress
                                ? 'Atualize os dados deste local de recebimento da sua empresa.'
                                : 'Informe o CEP para preencher automaticamente logradouro, bairro, cidade e UF.'}
                        </SheetDescription>
                    </SheetHeader>

                    <AddressForm
                        key={
                            editingAddress
                                ? `edit-address-${editingAddress.id}`
                                : 'create-address'
                        }
                        mode="sheet"
                        method={editingAddress ? 'put' : 'post'}
                        actionUrl={
                            editingAddress
                                ? `${addressBaseUrl}/${editingAddress.id}`
                                : addressStoreUrl
                        }
                        cepLookupUrl={cepLookupUrl}
                        initialAddress={editingAddress}
                        onSuccess={handleCloseSheet}
                        onCancel={handleCloseSheet}
                    />
                </SheetContent>
            </Sheet>

            {/* Modal de confirmação para remoção de endereço */}
            <Dialog
                open={addressToDelete !== null}
                onOpenChange={(open) => {
                    if (!open && !isDeleting) {
                        setAddressToDelete(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remover endereço de entrega?</DialogTitle>
                        <DialogDescription>
                            {addressToDelete ? (
                                <>
                                    O endereço{' '}
                                    <strong className="font-semibold text-foreground">
                                        {getAddressDisplayName(addressToDelete)}
                                    </strong>{' '}
                                    ({addressToDelete.city}/
                                    {addressToDelete.state} · CEP{' '}
                                    {addressToDelete.cep}) será removido da
                                    lista da empresa. Pedidos já realizados não
                                    são afetados.
                                </>
                            ) : (
                                'Este endereço será removido da lista da empresa.'
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 pt-2">
                        <DialogClose asChild>
                            <StoreButton
                                type="button"
                                variant="outline"
                                size="touch"
                                disabled={isDeleting}
                            >
                                Cancelar
                            </StoreButton>
                        </DialogClose>
                        <StoreButton
                            type="button"
                            variant="destructive"
                            size="touch"
                            loading={isDeleting}
                            loadingText="Removendo..."
                            onClick={handleConfirmDelete}
                        >
                            Confirmar remoção
                        </StoreButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
}

export default AddressPicker;
