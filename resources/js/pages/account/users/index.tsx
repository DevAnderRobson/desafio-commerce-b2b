import { Form, Head, usePage } from '@inertiajs/react';
import { StoreButton } from '@/components/button';
import { FormField } from '@/components/form-field';
import { Spinner } from '@/components/ui/spinner';
import { index as usersIndex, store } from '@/routes/account/users';

type CompanyUser = {
    id: number;
    name: string;
    email: string;
    role: 'owner' | 'member' | null;
};

type Props = {
    users: CompanyUser[];
};

export default function CompanyUsers({ users }: Props) {
    const { flash } = usePage<{ flash?: { status?: string } }>().props;

    return (
        <>
            <Head title="Usuários da empresa" />
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <section aria-labelledby="users-heading" className="grid gap-4">
                    <h2 id="users-heading" className="text-lg font-semibold">
                        Quem tem acesso
                    </h2>
                    <ul className="divide-y divide-border rounded-lg border border-border">
                        {users.map((user) => (
                            <li
                                key={user.id}
                                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                            >
                                <div className="min-w-0">
                                    <p className="truncate font-medium">
                                        {user.name}
                                    </p>
                                    <p className="truncate text-sm text-muted-foreground">
                                        {user.email}
                                    </p>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                    {user.role === 'owner'
                                        ? 'Administrador'
                                        : 'Membro'}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>

                <section
                    aria-labelledby="invite-heading"
                    className="grid content-start gap-4"
                >
                    <h2 id="invite-heading" className="text-lg font-semibold">
                        Adicionar usuário
                    </h2>
                    <Form
                        {...store.form()}
                        resetOnSuccess
                        disableWhileProcessing
                        className="grid gap-4"
                    >
                        {({ processing, errors }) => (
                            <>
                                <FormField
                                    label="Nome"
                                    name="name"
                                    autoComplete="off"
                                    required
                                    error={errors.name}
                                />
                                <FormField
                                    label="E-mail"
                                    name="email"
                                    type="email"
                                    autoComplete="off"
                                    required
                                    error={errors.email}
                                    hint="A pessoa recebe um e-mail para definir a senha."
                                />
                                <StoreButton type="submit">
                                    {processing && <Spinner />}
                                    Enviar convite
                                </StoreButton>
                                {flash?.status && (
                                    <p
                                        role="status"
                                        className="text-sm text-success-muted-foreground"
                                    >
                                        {flash.status}
                                    </p>
                                )}
                            </>
                        )}
                    </Form>
                </section>
            </div>
        </>
    );
}

CompanyUsers.layout = {
    title: 'Usuários da empresa',
    breadcrumbs: [{ title: 'Usuários da empresa', href: usersIndex() }],
};
