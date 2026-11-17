import { Head, router } from '@inertiajs/react';
import { Building2, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useId, useState } from 'react';
import { StoreButton } from '@/components/button';
import { AddressForm } from '@/components/checkout/address-form';
import { EmptyState } from '@/components/empty-state';
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
import { formatInteger } from '@/lib/format';
import { dashboard } from '@/routes/account';
import { index as addressesIndex } from '@/routes/account/addresses';
import type { AccountAddressesProps } from '@/types/account';
import type { AddressData } from '@/types/checkout';

function getAddressDisplayName(address: AddressData): string {
    if (address.label && address.label.trim() !== '') {
        return address.label.trim();
    }

    return `${address.street}, ${address.number}`;
}

export default function AccountAddresses({
    addresses,
    routes,
}: AccountAddressesProps) {
    const headingId = useId();

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

        router.delete(`${routes.base}/${target.id}`, {
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
    }, [addressToDelete, isDeleting, routes.base]);

    return (
        <>
            <Head title="Endereços da empresa" />

            <section
                aria-labelledby={headingId}
                className="flex flex-col gap-5"
            >
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                        <h2
                            id={headingId}
                            className="text-fluid-lg font-semibold tracking-tight text-foreground"
                        >
                            Locais de entrega da empresa
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {addresses.length === 0
                                ? 'Cadastre os endereços comerciais da empresa para agilizar o cálculo de frete no checkout.'
                                : `${formatInteger(addresses.length)} ${addresses.length === 1 ? 'endereço cadastrado' : 'endereços cadastrados'} e compartilhados entre os compradores da empresa.`}
                        </p>
                    </div>

                    {addresses.length > 0 && (
                        <StoreButton
                            type="button"
                            variant="default"
                            size="touch"
                            onClick={handleOpenCreateSheet}
                            className="font-semibold"
                        >
                            <Plus
                                className="size-4 shrink-0"
                                aria-hidden="true"
                            />
                            <span>Novo endereço</span>
                        </StoreButton>
                    )}
                </div>

                {addresses.length === 0 ? (
                    <EmptyState
                        icon={MapPin}
                        headingLevel="h3"
                        title="Sua empresa ainda não possui endereços cadastrados"
                        description="Adicione a matriz, filial ou depósito da sua empresa para usar nas entregas dos próximos pedidos."
                        actionLabel="Novo endereço"
                        onAction={handleOpenCreateSheet}
                    />
                ) : (
                    <ul
                        aria-label="Endereços cadastrados da empresa"
                        className="divide-y divide-border rounded-lg border border-border bg-card text-card-foreground"
                    >
                        {addresses.map((address, index) => {
                            const hasLabel = Boolean(
                                address.label && address.label.trim() !== '',
                            );
                            const isLastUsed =
                                index === 0 && address.lastUsedAt !== null;
                            const displayTitle = getAddressDisplayName(address);

                            return (
                                <li
                                    key={address.id}
                                    className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-start sm:p-5"
                                >
                                    <div className="flex min-w-0 flex-1 items-start gap-3.5">
                                        {hasLabel ? (
                                            <Building2
                                                className="mt-1 size-4 shrink-0 text-muted-foreground"
                                                aria-hidden="true"
                                            />
                                        ) : (
                                            <MapPin
                                                className="mt-1 size-4 shrink-0 text-muted-foreground"
                                                aria-hidden="true"
                                            />
                                        )}

                                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-base font-semibold text-foreground">
                                                    {hasLabel
                                                        ? address.label
                                                        : `${address.street}, ${address.number}`}
                                                </h3>

                                                {isLastUsed && (
                                                    <span className="inline-flex items-center rounded-sm border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                                                        Último utilizado
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-sm leading-relaxed text-foreground/90">
                                                {address.street},{' '}
                                                {address.number}
                                                {address.complement
                                                    ? ` — ${address.complement}`
                                                    : ''}
                                            </p>

                                            <p className="text-xs text-muted-foreground tabular-nums sm:text-sm">
                                                {address.neighborhood} ·{' '}
                                                {address.city}/{address.state} ·{' '}
                                                <span className="font-mono font-medium text-foreground/85">
                                                    CEP {address.cep}
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 items-center justify-end gap-1 border-t border-border/60 pt-2.5 sm:border-t-0 sm:pt-0">
                                        <StoreButton
                                            type="button"
                                            variant="ghost"
                                            size="touch"
                                            onClick={() =>
                                                handleOpenEditSheet(address)
                                            }
                                            aria-label={`Editar endereço ${displayTitle}`}
                                            className="h-11 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground sm:text-sm"
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
                                            onClick={() =>
                                                setAddressToDelete(address)
                                            }
                                            aria-label={`Remover endereço ${displayTitle}`}
                                            className="h-11 px-3 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:text-sm"
                                        >
                                            <Trash2
                                                className="size-3.5 shrink-0"
                                                aria-hidden="true"
                                            />
                                            <span>Remover</span>
                                        </StoreButton>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {/* Painel lateral (Sheet) para criar ou editar endereço da empresa */}
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
                                    ? 'Editar endereço da empresa'
                                    : 'Novo endereço da empresa'}
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
                                    ? `${routes.base}/${editingAddress.id}`
                                    : routes.store
                            }
                            cepLookupUrl={routes.cepLookup}
                            initialAddress={editingAddress}
                            onSuccess={handleCloseSheet}
                            onCancel={handleCloseSheet}
                        />
                    </SheetContent>
                </Sheet>

                {/* Dialog de confirmação para remover endereço */}
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
                            <DialogTitle>
                                Remover endereço da empresa?
                            </DialogTitle>
                            <DialogDescription>
                                {addressToDelete ? (
                                    <>
                                        O endereço{' '}
                                        <strong className="font-semibold text-foreground">
                                            {getAddressDisplayName(
                                                addressToDelete,
                                            )}
                                        </strong>{' '}
                                        ({addressToDelete.city}/
                                        {addressToDelete.state} · CEP{' '}
                                        {addressToDelete.cep}) será removido da
                                        lista da empresa. Pedidos já realizados
                                        não são afetados.
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
        </>
    );
}

AccountAddresses.layout = {
    title: 'Endereços da empresa',
    breadcrumbs: [
        {
            title: 'Resumo da conta',
            href: dashboard(),
        },
        {
            title: 'Endereços',
            href: addressesIndex(),
        },
    ],
};
