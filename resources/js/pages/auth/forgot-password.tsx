import { Form, Head } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';
import { StoreButton } from '@/components/button';
import { FormField } from '@/components/form-field';
import TextLink from '@/components/text-link';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { email } from '@/routes/password';

export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <>
            <Head title="Recuperar senha" />

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
                {...email.form()}
                disableWhileProcessing
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-5">
                            <FormField
                                id="email"
                                label="E-mail cadastrado"
                                type="email"
                                name="email"
                                autoComplete="email"
                                required
                                autoFocus
                                error={errors.email}
                            />

                            <StoreButton
                                type="submit"
                                className="w-full"
                                disabled={processing}
                                data-test="email-password-reset-link-button"
                            >
                                {processing && <Spinner />}
                                Enviar link de redefinição
                            </StoreButton>
                        </div>

                        <div className="text-center text-sm text-muted-foreground">
                            Lembrou a senha?{' '}
                            <TextLink href={login()}>
                                Voltar para o login
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

ForgotPassword.layout = {
    title: 'Recuperar senha',
    description:
        'Informe o e-mail da sua conta para receber o link de redefinição de senha.',
};
