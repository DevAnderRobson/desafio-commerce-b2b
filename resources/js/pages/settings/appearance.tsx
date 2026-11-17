import { Head } from '@inertiajs/react';
import AppearanceTabs from '@/components/appearance-tabs';
import Heading from '@/components/heading';
import { dashboard } from '@/routes/account';
import { edit as editAppearance } from '@/routes/appearance';
import { edit as editProfile } from '@/routes/profile';

export default function Appearance() {
    return (
        <>
            <Head title="Aparência - Configurações" />

            <section className="flex flex-col gap-6">
                <Heading
                    variant="small"
                    title="Tema e aparência"
                    description="Escolha entre o tema claro, escuro ou automático conforme o sistema. Você também pode alternar entre claro e escuro a qualquer momento pelo botão flutuante na lateral direita da tela."
                />
                <AppearanceTabs />
            </section>
        </>
    );
}

Appearance.layout = {
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
            title: 'Aparência',
            href: editAppearance(),
        },
    ],
};
