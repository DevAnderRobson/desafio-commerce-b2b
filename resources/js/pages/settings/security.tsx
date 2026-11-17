import { Form, Head } from '@inertiajs/react';
import { useRef } from 'react';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import { StoreButton } from '@/components/button';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import type { Props as ManageTwoFactorProps } from '@/components/manage-two-factor';
import ManageTwoFactor from '@/components/manage-two-factor';
import PasswordInput from '@/components/password-input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { dashboard } from '@/routes/account';
import { edit as editProfile } from '@/routes/profile';
import { edit } from '@/routes/security';

// oxfmt-ignore
type Props = {
    passwordRules: string;
} &
    ManageTwoFactorProps;

export default function Security(props: Props) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <>
            <Head title="Segurança - Configurações" />

            <section className="flex flex-col gap-6">
                <Heading
                    variant="small"
                    title="Alterar senha"
                    description="Utilize uma senha longa e exclusiva para manter o acesso à sua conta seguro."
                />

                <Form
                    {...SecurityController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    resetOnError={[
                        'password',
                        'password_confirmation',
                        'current_password',
                    ]}
                    resetOnSuccess
                    onError={(errors) => {
                        if (errors.password) {
                            passwordInput.current?.focus();
                        }

                        if (errors.current_password) {
                            currentPasswordInput.current?.focus();
                        }
                    }}
                    className="flex flex-col gap-5"
                >
                    {({ errors, processing, recentlySuccessful }) => (
                        <>
                            <div className="grid gap-1.5">
                                <Label htmlFor="current_password">
                                    Senha atual
                                </Label>

                                <PasswordInput
                                    id="current_password"
                                    ref={currentPasswordInput}
                                    name="current_password"
                                    autoComplete="current-password"
                                    aria-invalid={
                                        Boolean(errors.current_password) ||
                                        undefined
                                    }
                                    aria-describedby={
                                        errors.current_password
                                            ? 'security-current-password-error'
                                            : undefined
                                    }
                                />

                                <InputError
                                    id="security-current-password-error"
                                    message={errors.current_password}
                                />
                            </div>

                            <div className="grid gap-1.5">
                                <Label htmlFor="password">Nova senha</Label>

                                <PasswordInput
                                    id="password"
                                    ref={passwordInput}
                                    name="password"
                                    autoComplete="new-password"
                                    passwordrules={props.passwordRules}
                                    aria-invalid={
                                        Boolean(errors.password) || undefined
                                    }
                                    aria-describedby={
                                        errors.password
                                            ? 'security-new-password-error'
                                            : undefined
                                    }
                                />

                                <InputError
                                    id="security-new-password-error"
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
                                    autoComplete="new-password"
                                    passwordrules={props.passwordRules}
                                    aria-invalid={
                                        Boolean(errors.password_confirmation) ||
                                        undefined
                                    }
                                    aria-describedby={
                                        errors.password_confirmation
                                            ? 'security-confirm-password-error'
                                            : undefined
                                    }
                                />

                                <InputError
                                    id="security-confirm-password-error"
                                    message={errors.password_confirmation}
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-4">
                                <StoreButton
                                    type="submit"
                                    disabled={processing}
                                    data-test="update-password-button"
                                >
                                    {processing && <Spinner />}
                                    Salvar nova senha
                                </StoreButton>

                                {recentlySuccessful && (
                                    <span
                                        role="status"
                                        aria-live="polite"
                                        className="text-sm font-medium text-muted-foreground"
                                    >
                                        Senha atualizada.
                                    </span>
                                )}
                            </div>
                        </>
                    )}
                </Form>
            </section>

            {props.canManageTwoFactor && (
                <div className="border-t border-border pt-8">
                    <ManageTwoFactor
                        canManageTwoFactor={props.canManageTwoFactor}
                        requiresConfirmation={props.requiresConfirmation}
                        twoFactorEnabled={props.twoFactorEnabled}
                    />
                </div>
            )}
        </>
    );
}

Security.layout = {
    title: 'Configurações da conta',
    description:
        'Gerencie seus dados de perfil, senha, verificação em duas etapas e preferências de exibição.',
    breadcrumbs: [
        {
            title: 'Minha conta',
            href: dashboard(),
        },
        {
            title: 'Configurações',
            href: editProfile(),
        },
        {
            title: 'Segurança e 2FA',
            href: edit(),
        },
    ],
};
