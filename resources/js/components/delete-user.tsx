import { Form } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import { useRef } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import { StoreButton } from '@/components/button';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

export default function DeleteUser() {
    const passwordInput = useRef<HTMLInputElement>(null);

    return (
        <section className="flex flex-col gap-5">
            <Heading
                variant="small"
                title="Excluir conta"
                description="Remova permanentemente o seu usuário e os dados vinculados a ele."
            />
            <div className="flex flex-col gap-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                    <AlertTriangle
                        className="mt-0.5 size-5 shrink-0 text-destructive"
                        aria-hidden="true"
                    />
                    <div className="flex flex-col gap-0.5">
                        <p className="text-sm font-semibold text-foreground">
                            Atenção: ação permanente
                        </p>
                        <p className="text-sm text-foreground/90">
                            Ao prosseguir, seu acesso será encerrado e esta ação
                            não poderá ser desfeita.
                        </p>
                    </div>
                </div>

                <div>
                    <Dialog>
                        <DialogTrigger asChild>
                            <StoreButton
                                type="button"
                                variant="destructive"
                                data-test="delete-user-button"
                            >
                                Excluir minha conta
                            </StoreButton>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogTitle>
                                Tem certeza de que deseja excluir sua conta?
                            </DialogTitle>
                            <DialogDescription>
                                Depois que sua conta for excluída, todos os seus
                                dados pessoais de acesso serão removidos
                                permanentemente. Informe sua senha atual para
                                confirmar a exclusão.
                            </DialogDescription>

                            <Form
                                {...ProfileController.destroy.form()}
                                options={{
                                    preserveScroll: true,
                                }}
                                onError={() => passwordInput.current?.focus()}
                                resetOnSuccess
                                className="flex flex-col gap-5"
                            >
                                {({
                                    resetAndClearErrors,
                                    processing,
                                    errors,
                                }) => (
                                    <>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="delete-account-password">
                                                Senha atual
                                            </Label>

                                            <PasswordInput
                                                id="delete-account-password"
                                                name="password"
                                                ref={passwordInput}
                                                autoComplete="current-password"
                                                aria-invalid={
                                                    Boolean(errors.password) ||
                                                    undefined
                                                }
                                                aria-describedby={
                                                    errors.password
                                                        ? 'delete-account-password-error'
                                                        : undefined
                                                }
                                            />

                                            <InputError
                                                id="delete-account-password-error"
                                                message={errors.password}
                                            />
                                        </div>

                                        <DialogFooter className="gap-2">
                                            <DialogClose asChild>
                                                <StoreButton
                                                    type="button"
                                                    variant="secondary"
                                                    onClick={() =>
                                                        resetAndClearErrors()
                                                    }
                                                >
                                                    Cancelar
                                                </StoreButton>
                                            </DialogClose>

                                            <StoreButton
                                                type="submit"
                                                variant="destructive"
                                                disabled={processing}
                                                data-test="confirm-delete-user-button"
                                            >
                                                {processing && <Spinner />}
                                                Confirmar exclusão
                                            </StoreButton>
                                        </DialogFooter>
                                    </>
                                )}
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </section>
    );
}
