import { Form, Head } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';
import { StoreButton } from '@/components/button';
import { FormField } from '@/components/form-field';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
    return (
        <>
            <Head title="Entrar na conta" />

            {status && (
                <div
                    role="status"
                    aria-live="polite"
                    className="mb-5 flex items-start gap-2.5 rounded-md border border-success/35 bg-success-muted p-3.5 text-sm font-medium text-success-muted-foreground"
                >
                    <CheckCircle2
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden="true"
                    />
                    <span>{status}</span>
                </div>
            )}

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                disableWhileProcessing
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-5">
                            <FormField
                                id="email"
                                label="E-mail"
                                type="email"
                                name="email"
                                required
                                autoFocus
                                autoComplete="email"
                                error={errors.email}
                            />

                            <div className="grid gap-1.5">
                                <div className="flex items-baseline justify-between gap-2">
                                    <Label htmlFor="password">Senha</Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="text-sm"
                                        >
                                            Esqueceu a senha?
                                        </TextLink>
                                    )}
                                </div>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    autoComplete="current-password"
                                    aria-invalid={
                                        Boolean(errors.password) || undefined
                                    }
                                    aria-describedby={
                                        errors.password
                                            ? 'login-password-error'
                                            : undefined
                                    }
                                />
                                <InputError
                                    id="login-password-error"
                                    message={errors.password}
                                />
                            </div>

                            <div className="flex min-h-11 items-center gap-3">
                                <Checkbox id="remember" name="remember" />
                                <Label
                                    htmlFor="remember"
                                    className="cursor-pointer text-sm font-normal"
                                >
                                    Manter conectado neste dispositivo
                                </Label>
                            </div>

                            <StoreButton
                                type="submit"
                                className="w-full"
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                Entrar
                            </StoreButton>
                        </div>

                        <div className="text-center text-sm text-muted-foreground">
                            Sua empresa ainda não tem cadastro?{' '}
                            <TextLink href={register()}>
                                Solicitar cadastro
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

Login.layout = {
    title: 'Acesse a conta da sua empresa',
    description:
        'Informe seu e-mail corporativo e sua senha para consultar preços e fazer pedidos.',
};
