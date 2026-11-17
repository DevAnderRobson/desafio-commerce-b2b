import { Form, Head } from '@inertiajs/react';
import { StoreButton } from '@/components/button';
import { FormField } from '@/components/form-field';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { update } from '@/routes/password';

type Props = {
    token: string;
    email: string;
    passwordRules: string;
};

export default function ResetPassword({ token, email, passwordRules }: Props) {
    return (
        <>
            <Head title="Redefinir senha" />

            <Form
                {...update.form()}
                transform={(data) => ({ ...data, token, email })}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <div className="grid gap-5">
                        <FormField
                            id="email"
                            label="E-mail"
                            type="email"
                            name="email"
                            autoComplete="email"
                            value={email}
                            readOnly
                            error={errors.email}
                        />

                        <div className="grid gap-1.5">
                            <Label htmlFor="password">Nova senha</Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                required
                                autoComplete="new-password"
                                autoFocus
                                passwordrules={passwordRules}
                                aria-invalid={
                                    Boolean(errors.password) || undefined
                                }
                                aria-describedby={
                                    errors.password
                                        ? 'reset-password-error'
                                        : undefined
                                }
                            />
                            <InputError
                                id="reset-password-error"
                                message={errors.password}
                            />
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor="password_confirmation">
                                Confirmar nova senha
                            </Label>
                            <PasswordInput
                                id="password_confirmation"
                                name="password_confirmation"
                                required
                                autoComplete="new-password"
                                passwordrules={passwordRules}
                                aria-invalid={
                                    Boolean(errors.password_confirmation) ||
                                    undefined
                                }
                                aria-describedby={
                                    errors.password_confirmation
                                        ? 'reset-password-confirmation-error'
                                        : undefined
                                }
                            />
                            <InputError
                                id="reset-password-confirmation-error"
                                message={errors.password_confirmation}
                            />
                        </div>

                        <StoreButton
                            type="submit"
                            className="w-full"
                            disabled={processing}
                            data-test="reset-password-button"
                        >
                            {processing && <Spinner />}
                            Salvar nova senha
                        </StoreButton>
                    </div>
                )}
            </Form>
        </>
    );
}

ResetPassword.layout = {
    title: 'Definir nova senha',
    description:
        'Escolha uma senha segura para acessar a conta da sua empresa.',
};
