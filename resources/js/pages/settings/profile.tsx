import { Form, Head, Link, usePage } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import { StoreButton } from '@/components/button';
import DeleteUser from '@/components/delete-user';
import { FormField } from '@/components/form-field';
import Heading from '@/components/heading';
import { Spinner } from '@/components/ui/spinner';
import { dashboard } from '@/routes/account';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';
import type { Auth } from '@/types';

type PageProps = {
    auth: Auth;
};

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<PageProps>().props;

    return (
        <>
            <Head title="Perfil - Configurações" />

            <section
                aria-labelledby="profile-settings-heading"
                className="flex flex-col gap-6"
            >
                <Heading
                    variant="small"
                    title="Dados do perfil"
                    description="Atualize seu nome completo e o endereço de e-mail utilizado para acessar a conta."
                />

                <Form
                    {...ProfileController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    className="flex flex-col gap-5"
                >
                    {({ processing, recentlySuccessful, errors }) => (
                        <>
                            <FormField
                                id="name"
                                label="Nome completo"
                                defaultValue={auth.user.name}
                                name="name"
                                required
                                autoComplete="name"
                                error={errors.name}
                            />

                            <FormField
                                id="email"
                                label="E-mail"
                                type="email"
                                defaultValue={auth.user.email}
                                name="email"
                                required
                                autoComplete="username"
                                error={errors.email}
                            />

                            {mustVerifyEmail &&
                                auth.user.email_verified_at === null && (
                                    <div className="flex flex-col gap-2 rounded-md border border-warning/40 bg-warning-muted/60 p-3.5 text-sm">
                                        <p className="text-foreground">
                                            Seu endereço de e-mail ainda não foi
                                            verificado.{' '}
                                            <Link
                                                href={send()}
                                                as="button"
                                                className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-foreground underline underline-offset-4 hover:text-brand-muted-foreground focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                            >
                                                Reenviar e-mail de verificação
                                            </Link>
                                        </p>

                                        {status ===
                                            'verification-link-sent' && (
                                            <div
                                                role="status"
                                                className="flex items-center gap-2 text-sm font-medium text-success-muted-foreground"
                                            >
                                                <CheckCircle2
                                                    className="size-4 shrink-0"
                                                    aria-hidden="true"
                                                />
                                                <span>
                                                    Um novo link de verificação
                                                    foi enviado para o seu
                                                    endereço de e-mail.
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                            <div className="flex flex-wrap items-center gap-4">
                                <StoreButton
                                    type="submit"
                                    disabled={processing}
                                    data-test="update-profile-button"
                                >
                                    {processing && <Spinner />}
                                    Salvar alterações
                                </StoreButton>

                                {recentlySuccessful && (
                                    <span
                                        role="status"
                                        aria-live="polite"
                                        className="text-sm font-medium text-muted-foreground"
                                    >
                                        Alterações salvas.
                                    </span>
                                )}
                            </div>
                        </>
                    )}
                </Form>
            </section>

            <div className="border-t border-border pt-8">
                <DeleteUser />
            </div>
        </>
    );
}

Profile.layout = {
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
            href: edit(),
        },
    ],
};
