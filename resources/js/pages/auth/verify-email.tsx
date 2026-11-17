import { Form, Head } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';
import { StoreButton } from '@/components/button';
import TextLink from '@/components/text-link';
import { Spinner } from '@/components/ui/spinner';
import { logout } from '@/routes';
import { send } from '@/routes/verification';

export default function VerifyEmail({ status }: { status?: string }) {
    return (
        <>
            <Head title="Verificação de e-mail" />

            {status === 'verification-link-sent' && (
                <div
                    role="status"
                    aria-live="polite"
                    className="mb-5 flex items-start gap-2.5 rounded-md border border-success/35 bg-success-muted p-3.5 text-sm font-medium text-success-muted-foreground"
                >
                    <CheckCircle2
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden="true"
                    />
                    <span>
                        Enviamos um novo link de confirmação para o endereço de
                        e-mail informado no cadastro.
                    </span>
                </div>
            )}

            <Form
                {...send.form()}
                disableWhileProcessing
                className="flex flex-col gap-5 text-center"
            >
                {({ processing }) => (
                    <>
                        <StoreButton
                            type="submit"
                            disabled={processing}
                            variant="secondary"
                            className="w-full"
                        >
                            {processing && <Spinner />}
                            Reenviar e-mail de confirmação
                        </StoreButton>

                        <div>
                            <TextLink
                                href={logout()}
                                className="inline-flex min-h-11 items-center text-sm"
                            >
                                Sair da conta
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

VerifyEmail.layout = {
    title: 'Confirme seu endereço de e-mail',
    description:
        'Acesse o link enviado para o seu e-mail para concluir a verificação do cadastro.',
};
