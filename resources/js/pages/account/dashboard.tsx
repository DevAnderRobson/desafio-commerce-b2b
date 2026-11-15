import { Head } from '@inertiajs/react';
import { EmptyState } from '@/components/empty-state';
import { dashboard } from '@/routes/account';

export default function AccountDashboard() {
    return (
        <>
            <Head title="Resumo da conta" />
            <EmptyState
                title="Resumo da conta"
                description="Pedidos recentes e limite de crédito disponível aparecerão aqui."
            />
        </>
    );
}

AccountDashboard.layout = {
    title: 'Resumo da conta',
    breadcrumbs: [
        {
            title: 'Resumo da conta',
            href: dashboard(),
        },
    ],
};
