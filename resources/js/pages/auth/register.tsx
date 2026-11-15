import { Form, Head } from '@inertiajs/react';
import { StoreButton } from '@/components/button';
import { FormField } from '@/components/form-field';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { store } from '@/routes/register';

type Props = {
    passwordRules: string;
};

export default function Register({ passwordRules }: Props) {
    return (
        <>
            <Head title="Cadastro da empresa" />
            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-5">
                            <fieldset className="grid gap-4">
                                <legend className="mb-1 text-sm font-semibold">
                                    Dados da empresa
                                </legend>
                                <FormField
                                    label="CNPJ"
                                    name="cnpj"
                                    inputMode="numeric"
                                    autoComplete="off"
                                    placeholder="00.000.000/0000-00"
                                    required
                                    autoFocus
                                    error={errors.cnpj}
                                />
                                <FormField
                                    label="Razão social"
                                    name="legal_name"
                                    autoComplete="organization"
                                    required
                                    error={errors.legal_name}
                                />
                                <FormField
                                    label="Nome fantasia"
                                    name="trade_name"
                                    optional
                                    optionalLabel="Opcional"
                                    error={errors.trade_name}
                                />
                            </fieldset>

                            <fieldset className="grid gap-4">
                                <legend className="mb-1 text-sm font-semibold">
                                    Seu acesso (administrador da empresa)
                                </legend>
                                <FormField
                                    label="Nome completo"
                                    name="name"
                                    autoComplete="name"
                                    required
                                    error={errors.name}
                                />
                                <FormField
                                    label="E-mail"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    error={errors.email}
                                />
                                <div className="grid gap-1.5">
                                    <Label htmlFor="password">Senha</Label>
                                    <PasswordInput
                                        id="password"
                                        required
                                        autoComplete="new-password"
                                        name="password"
                                        passwordrules={passwordRules}
                                    />
                                    <InputError message={errors.password} />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="password_confirmation">
                                        Confirmar senha
                                    </Label>
                                    <PasswordInput
                                        id="password_confirmation"
                                        required
                                        autoComplete="new-password"
                                        name="password_confirmation"
                                        passwordrules={passwordRules}
                                    />
                                    <InputError
                                        message={errors.password_confirmation}
                                    />
                                </div>
                            </fieldset>

                            <StoreButton
                                type="submit"
                                className="w-full"
                                data-test="register-user-button"
                            >
                                {processing && <Spinner />}
                                Solicitar cadastro
                            </StoreButton>
                            <p className="text-sm text-muted-foreground">
                                Depois de confirmar o seu e-mail, o cadastro é
                                analisado pela loja. Você será avisado por
                                e-mail quando for aprovado.
                            </p>
                        </div>

                        <div className="text-center text-sm text-muted-foreground">
                            Já tem uma conta?{' '}
                            <TextLink href={login()}>Entrar</TextLink>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

Register.layout = {
    title: 'Cadastre a sua empresa',
    description: 'Informe os dados da empresa e do administrador do acesso',
};
