import { Form, Head } from '@inertiajs/react';
import { StoreButton } from '@/components/button';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/password/confirm';

export default function ConfirmPassword() {
    return (
        <>
            <Head title="Confirmar senha" />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                disableWhileProcessing
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <div className="grid gap-5">
                        <div className="grid gap-1.5">
                            <Label htmlFor="password">Senha atual</Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                required
                                autoComplete="current-password"
                                autoFocus
                                aria-invalid={
                                    Boolean(errors.password) || undefined
                                }
                                aria-describedby={
                                    errors.password
                                        ? 'confirm-password-error'
                                        : undefined
                                }
                            />
                            <InputError
                                id="confirm-password-error"
                                message={errors.password}
                            />
                        </div>

                        <StoreButton
                            type="submit"
                            className="w-full"
                            disabled={processing}
                            data-test="confirm-password-button"
                        >
                            {processing && <Spinner />}
                            Confirmar senha
                        </StoreButton>
                    </div>
                )}
            </Form>
        </>
    );
}

ConfirmPassword.layout = {
    title: 'Confirme sua senha',
    description:
        'Esta é uma área protegida da conta. Informe sua senha atual antes de continuar.',
};
