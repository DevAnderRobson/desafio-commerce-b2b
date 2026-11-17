import { Form, Head } from '@inertiajs/react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { useState } from 'react';
import { StoreButton } from '@/components/button';
import { FormField } from '@/components/form-field';
import InputError from '@/components/input-error';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { OTP_MAX_LENGTH } from '@/hooks/use-two-factor-auth';
import { store } from '@/routes/two-factor/login';

export default function TwoFactorChallenge() {
    const [showRecoveryInput, setShowRecoveryInput] = useState<boolean>(false);
    const [code, setCode] = useState<string>('');

    const toggleRecoveryMode = (clearErrors: () => void): void => {
        setShowRecoveryInput((prev) => !prev);
        clearErrors();
        setCode('');
    };

    return (
        <>
            <Head title="Verificação em duas etapas" />

            <div className="flex flex-col gap-5">
                <p className="text-sm leading-relaxed text-muted-foreground">
                    {showRecoveryInput
                        ? 'Informe um dos códigos de recuperação de emergência gerados quando você ativou a verificação em duas etapas.'
                        : 'Digite o código de 6 dígitos exibido no aplicativo autenticador do seu celular.'}
                </p>

                <Form
                    {...store.form()}
                    className="flex flex-col gap-5"
                    resetOnError
                    resetOnSuccess={!showRecoveryInput}
                    disableWhileProcessing
                >
                    {({ errors, processing, clearErrors }) => (
                        <>
                            {showRecoveryInput ? (
                                <FormField
                                    id="recovery_code"
                                    label="Código de recuperação"
                                    name="recovery_code"
                                    type="text"
                                    autoComplete="one-time-code"
                                    autoFocus={showRecoveryInput}
                                    required
                                    error={errors.recovery_code}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-2 text-center">
                                    <Label
                                        htmlFor="code"
                                        className="text-sm font-medium text-foreground"
                                    >
                                        Código de autenticação (6 dígitos)
                                    </Label>
                                    <div className="flex w-full items-center justify-center">
                                        <InputOTP
                                            id="code"
                                            name="code"
                                            maxLength={OTP_MAX_LENGTH}
                                            value={code}
                                            onChange={(value) => setCode(value)}
                                            disabled={processing}
                                            pattern={REGEXP_ONLY_DIGITS}
                                            autoFocus
                                        >
                                            <InputOTPGroup>
                                                {Array.from(
                                                    { length: OTP_MAX_LENGTH },
                                                    (_, index) => (
                                                        <InputOTPSlot
                                                            key={index}
                                                            index={index}
                                                        />
                                                    ),
                                                )}
                                            </InputOTPGroup>
                                        </InputOTP>
                                    </div>
                                    <InputError message={errors.code} />
                                </div>
                            )}

                            <StoreButton
                                type="submit"
                                className="w-full"
                                disabled={processing}
                            >
                                {processing && <Spinner />}
                                Validar acesso
                            </StoreButton>

                            <div className="text-center text-sm text-muted-foreground">
                                <span>Ou você pode </span>
                                <button
                                    type="button"
                                    className="inline-flex min-h-11 cursor-pointer items-center font-medium text-foreground underline decoration-border underline-offset-4 transition-colors duration-150 ease-out hover:decoration-current focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                    onClick={() =>
                                        toggleRecoveryMode(clearErrors)
                                    }
                                >
                                    {showRecoveryInput
                                        ? 'entrar com o código do aplicativo autenticador'
                                        : 'entrar usando um código de recuperação'}
                                </button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

TwoFactorChallenge.layout = {
    title: 'Verificação em duas etapas',
    description:
        'Confirme o acesso à sua conta informando o código de segurança.',
};
