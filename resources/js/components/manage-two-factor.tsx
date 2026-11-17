import { Form } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { StoreButton } from '@/components/button';
import Heading from '@/components/heading';
import TwoFactorRecoveryCodes from '@/components/two-factor-recovery-codes';
import TwoFactorSetupModal from '@/components/two-factor-setup-modal';
import { Spinner } from '@/components/ui/spinner';
import { useTwoFactorAuth } from '@/hooks/use-two-factor-auth';
import { disable, enable } from '@/routes/two-factor';

export type Props = {
    canManageTwoFactor?: boolean;
    requiresConfirmation?: boolean;
    twoFactorEnabled?: boolean;
};

export default function ManageTwoFactor(props: Props) {
    const requiresConfirmation = props.requiresConfirmation ?? false;
    const twoFactorEnabled = props.twoFactorEnabled ?? false;

    const {
        qrCodeSvg,
        hasSetupData,
        manualSetupKey,
        clearSetupData,
        clearTwoFactorAuthData,
        fetchSetupData,
        recoveryCodesList,
        fetchRecoveryCodes,
        errors,
    } = useTwoFactorAuth();
    const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
    const prevTwoFactorEnabled = useRef(twoFactorEnabled);

    useEffect(() => {
        if (prevTwoFactorEnabled.current && !twoFactorEnabled) {
            clearTwoFactorAuthData();
        }

        prevTwoFactorEnabled.current = twoFactorEnabled;
    }, [twoFactorEnabled, clearTwoFactorAuthData]);

    if (!(props.canManageTwoFactor ?? false)) {
        return null;
    }

    return (
        <section className="flex flex-col gap-5">
            <Heading
                variant="small"
                title="Autenticação em duas etapas (2FA)"
                description="Proteja sua conta exigindo um código temporário do celular ao entrar."
            />
            {twoFactorEnabled ? (
                <div className="flex flex-col items-start justify-start gap-4">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        A verificação em duas etapas está ativada. Durante o
                        login, solicitaremos o código de 6 dígitos gerado pelo
                        aplicativo autenticador no seu celular.
                    </p>

                    <div className="relative inline">
                        <Form {...disable.form()}>
                            {({ processing }) => (
                                <StoreButton
                                    variant="destructive"
                                    type="submit"
                                    disabled={processing}
                                >
                                    {processing && <Spinner />}
                                    Desativar 2FA
                                </StoreButton>
                            )}
                        </Form>
                    </div>

                    <TwoFactorRecoveryCodes
                        recoveryCodesList={recoveryCodesList}
                        fetchRecoveryCodes={fetchRecoveryCodes}
                        errors={errors}
                    />
                </div>
            ) : (
                <div className="flex flex-col items-start justify-start gap-4">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        Ao ativar a autenticação em duas etapas, um código
                        temporário será solicitado no login. Você pode gerar
                        esse código em aplicativos autenticadores (como Google
                        Authenticator, Authy ou 1Password) no seu celular.
                    </p>

                    <div>
                        {hasSetupData ? (
                            <StoreButton
                                type="button"
                                onClick={() => setShowSetupModal(true)}
                            >
                                <ShieldCheck aria-hidden="true" />
                                Continuar configuração
                            </StoreButton>
                        ) : (
                            <Form
                                {...enable.form()}
                                onSuccess={() => setShowSetupModal(true)}
                            >
                                {({ processing }) => (
                                    <StoreButton
                                        type="submit"
                                        disabled={processing}
                                    >
                                        {processing && <Spinner />}
                                        Ativar 2FA
                                    </StoreButton>
                                )}
                            </Form>
                        )}
                    </div>
                </div>
            )}

            <TwoFactorSetupModal
                isOpen={showSetupModal}
                onClose={() => setShowSetupModal(false)}
                requiresConfirmation={requiresConfirmation}
                twoFactorEnabled={twoFactorEnabled}
                qrCodeSvg={qrCodeSvg}
                manualSetupKey={manualSetupKey}
                clearSetupData={clearSetupData}
                fetchSetupData={fetchSetupData}
                errors={errors}
            />
        </section>
    );
}
