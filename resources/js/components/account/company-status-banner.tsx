import { Link } from '@inertiajs/react';
import {
    AlertTriangle,
    Ban,
    Building2,
    CheckCircle2,
    Clock,
    ShoppingBag,
} from 'lucide-react';
import { StoreButton } from '@/components/button';
import { cn } from '@/lib/utils';
import type { AccountCompany } from '@/types/account';
import type { CompanyStatusBannerProps } from '@/types/account-ui';

function resolveCompanyStatusMeta(company: AccountCompany): {
    statusLabel: string;
    badgeClassName: string;
} {
    if (company.isBlocked) {
        return {
            statusLabel: 'Conta bloqueada',
            badgeClassName:
                'border-destructive/40 bg-destructive/10 text-destructive',
        };
    }

    switch (company.approvalStatus) {
        case 'approved':
            return {
                statusLabel: 'Cadastro aprovado',
                badgeClassName:
                    'border-success/35 bg-success-muted text-success-muted-foreground',
            };
        case 'rejected':
            return {
                statusLabel: 'Cadastro não aprovado',
                badgeClassName:
                    'border-destructive/40 bg-destructive/10 text-destructive',
            };
        case 'pending':
        default:
            return {
                statusLabel: 'Aguardando aprovação',
                badgeClassName:
                    'border-warning/40 bg-warning-muted text-warning-muted-foreground',
            };
    }
}

/**
 * Painel de identificação da empresa e avisos de aprovação/bloqueio comercial.
 * Exibe razão/nome fantasia, modelo de compra ("Padrão" / "Atacadista") como texto explícito
 * e alerta acessível quando a empresa estiver pendente, recusada ou bloqueada.
 */
export function CompanyStatusBanner({
    company,
    shopHref,
}: CompanyStatusBannerProps) {
    if (!company) {
        return (
            <section
                aria-label="Situação da empresa"
                className="rounded-lg border border-border bg-card p-4 text-card-foreground sm:p-5"
            >
                <div className="flex items-start gap-3">
                    <Building2
                        className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                    />
                    <div className="flex flex-col gap-1">
                        <h2 className="text-base font-semibold text-foreground">
                            Conta sem empresa vinculada
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Seu usuário ainda não possui uma empresa associada
                            para faturamento B2B.
                        </p>
                    </div>
                </div>
            </section>
        );
    }

    const statusMeta = resolveCompanyStatusMeta(company);
    const purchaseModelLabel = company.purchaseModel ?? 'Em definição';
    const roleLabel = company.isOwner ? 'Administrador' : 'Comprador vinculado';

    const showAlertBanner =
        company.isBlocked || company.approvalStatus !== 'approved';

    return (
        <div className="flex flex-col gap-4">
            {/* Aviso acessível em destaque quando pendente, recusada ou bloqueada */}
            {showAlertBanner && (
                <section
                    role={
                        company.isBlocked ||
                        company.approvalStatus === 'rejected'
                            ? 'alert'
                            : 'status'
                    }
                    aria-live="polite"
                    aria-label="Aviso sobre a situação cadastral da empresa"
                    className={cn(
                        'flex flex-col justify-between gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:p-5',
                        company.isBlocked ||
                            company.approvalStatus === 'rejected'
                            ? 'border-destructive/40 bg-destructive/10 text-foreground'
                            : 'border-warning/40 bg-warning-muted/60 text-foreground',
                    )}
                >
                    <div className="flex items-start gap-3.5">
                        {company.isBlocked ? (
                            <Ban
                                className="mt-0.5 size-5 shrink-0 text-destructive"
                                aria-hidden="true"
                            />
                        ) : company.approvalStatus === 'rejected' ? (
                            <AlertTriangle
                                className="mt-0.5 size-5 shrink-0 text-destructive"
                                aria-hidden="true"
                            />
                        ) : (
                            <Clock
                                className="mt-0.5 size-5 shrink-0 text-warning-muted-foreground"
                                aria-hidden="true"
                            />
                        )}

                        <div className="flex flex-col gap-1">
                            <h2 className="text-base font-semibold text-foreground">
                                {company.isBlocked
                                    ? 'Conta comercial bloqueada para novas compras'
                                    : company.approvalStatus === 'rejected'
                                      ? 'Cadastro da empresa não aprovado'
                                      : 'Cadastro da empresa em análise'}
                            </h2>
                            <p className="max-w-3xl text-sm leading-relaxed text-foreground/90">
                                {company.isBlocked
                                    ? 'Sua empresa está temporariamente impedida de fechar novos pedidos. Você ainda pode consultar o histórico de pedidos e gerenciar os endereços cadastrados. Entre em contato com o setor financeiro para regularizar o acesso.'
                                    : company.approvalStatus === 'rejected'
                                      ? 'Não foi possível aprovar o cadastro comercial desta empresa. Consulte o e-mail enviado ao administrador para verificar o motivo e as orientações de regularização.'
                                      : 'Nossa equipe comercial está validando os dados da sua empresa. Enquanto a análise estiver em andamento, você pode navegar pelo catálogo e montar sua lista de desejos; preços e fechamento de pedidos serão liberados assim que o cadastro for aprovado.'}
                            </p>
                        </div>
                    </div>

                    {company.approvalStatus === 'pending' &&
                        !company.isBlocked && (
                            <StoreButton
                                variant="outline"
                                size="touch"
                                asChild
                                className="shrink-0 bg-background font-semibold"
                            >
                                <Link href={shopHref}>
                                    <ShoppingBag
                                        className="size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>Explorar catálogo</span>
                                </Link>
                            </StoreButton>
                        )}
                </section>
            )}

            {/* Identificação corporativa (empresa, modelo de compra em texto e status) */}
            <section
                aria-label="Dados comerciais da empresa"
                className="flex flex-col justify-between gap-4 rounded-lg border border-border bg-card p-4 text-card-foreground sm:flex-row sm:items-center sm:p-5"
            >
                <div className="flex min-w-0 items-start gap-3">
                    <Building2
                        className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                    />
                    <div className="flex min-w-0 flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-base font-semibold text-foreground sm:text-lg">
                                {company.name}
                            </h2>
                            <span
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-semibold',
                                    statusMeta.badgeClassName,
                                )}
                            >
                                {company.approvalStatus === 'approved' &&
                                    !company.isBlocked && (
                                        <CheckCircle2
                                            className="size-3.5 shrink-0"
                                            aria-hidden="true"
                                        />
                                    )}
                                <span>{statusMeta.statusLabel}</span>
                            </span>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            <span>Perfil de acesso: </span>
                            <strong className="font-medium text-foreground">
                                {roleLabel}
                            </strong>
                        </p>
                    </div>
                </div>

                <dl className="flex shrink-0 flex-wrap items-center gap-4 border-t border-border/70 pt-3 text-sm sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5">
                    <div className="flex flex-col gap-0.5">
                        <dt className="text-xs text-muted-foreground">
                            Modelo de compra
                        </dt>
                        <dd className="font-semibold text-foreground">
                            {purchaseModelLabel}
                        </dd>
                    </div>
                </dl>
            </section>
        </div>
    );
}
