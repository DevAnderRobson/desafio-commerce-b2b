import { Head, usePage } from '@inertiajs/react';
import { EmptyState } from '@/components/empty-state';

export default function PendingApproval() {
    const { company } = usePage().props;
    const rejected = company?.approval_status === 'rejected';

    return (
        <>
            <Head title="Cadastro em análise" />
            <EmptyState
                title={
                    rejected ? 'Cadastro não aprovado' : 'Cadastro em análise'
                }
                description={
                    rejected
                        ? 'O cadastro desta empresa não foi aprovado. Verifique o e-mail que enviamos com mais detalhes.'
                        : 'A loja está analisando o cadastro da sua empresa. Enquanto isso você pode navegar pelo catálogo, mas os preços e a compra só são liberados após a aprovação. Avisaremos por e-mail.'
                }
                actionLabel="Ver o catálogo"
                actionHref="/"
            />
        </>
    );
}

PendingApproval.layout = {
    title: 'Cadastro em análise',
};
