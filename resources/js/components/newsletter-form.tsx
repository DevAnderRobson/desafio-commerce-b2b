import { Form } from '@inertiajs/react';
import { useId } from 'react';
import { StoreButton } from '@/components/button';
import { FormField } from '@/components/form-field';
import InputError from '@/components/input-error';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { store } from '@/routes/newsletter';

export type NewsletterFormProps = {
    headingLevel?: 'h2' | 'h3';
    className?: string;
};

/**
 * Formulário de inscrição no informativo comercial (newsletter) com double opt-in e consentimento LGPD.
 * Usa Wayfinder (`newsletter.store`), honeypot oculto (`website`) e feedback de apoio via aria-live.
 * O toast global de confirmação é disparado via flash data pelo backend (`useFlashToast`).
 */
export function NewsletterForm({
    headingLevel = 'h2',
    className,
}: NewsletterFormProps) {
    const baseId = useId();
    const emailInputId = `newsletter-email-${baseId}`;
    const consentInputId = `newsletter-consent-${baseId}`;
    const consentErrorId = `newsletter-consent-error-${baseId}`;
    const honeypotId = `newsletter-website-${baseId}`;
    const supportTextId = `newsletter-support-${baseId}`;
    const HeadingTag = headingLevel;

    return (
        <Form
            {...store.form()}
            resetOnSuccess
            options={{
                preserveScroll: true,
            }}
            aria-label="Inscrição no informativo comercial"
            className={cn('flex flex-col gap-3', className)}
        >
            {({ errors, processing, wasSuccessful }) => {
                const consentDescribedBy = [
                    supportTextId,
                    errors.consent ? consentErrorId : undefined,
                ]
                    .filter(Boolean)
                    .join(' ');

                return (
                    <>
                        <div className="flex flex-col gap-1">
                            <HeadingTag className="text-sm font-semibold text-foreground">
                                Informativo comercial
                            </HeadingTag>
                            <p
                                id={supportTextId}
                                aria-live="polite"
                                className="text-xs leading-relaxed text-muted-foreground"
                            >
                                {wasSuccessful
                                    ? 'Enviaremos um link de confirmação ao seu e-mail. Acesse a mensagem para ativar a inscrição.'
                                    : 'Receba tabelas promocionais e avisos de reposição de estoque. Enviaremos um link de confirmação ao seu e-mail.'}
                            </p>
                        </div>

                        {/* Honeypot anti-spam: invisível para usuários reais e leitores de tela */}
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -left-[9999px] size-px overflow-hidden opacity-0"
                        >
                            <label htmlFor={honeypotId}>
                                Não preencha este campo
                            </label>
                            <input
                                id={honeypotId}
                                type="text"
                                name="website"
                                defaultValue=""
                                tabIndex={-1}
                                autoComplete="off"
                            />
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                            <FormField
                                id={emailInputId}
                                label="E-mail corporativo"
                                type="email"
                                name="email"
                                required
                                autoComplete="email"
                                placeholder="compras@suaempresa.com.br"
                                error={errors.email}
                                disabled={processing}
                                containerClassName="flex-1"
                            />
                            <StoreButton
                                type="submit"
                                variant="secondary"
                                size="touch"
                                loading={processing}
                                loadingText="Enviando..."
                                className="shrink-0 sm:mt-[26px]"
                            >
                                Inscrever-se
                            </StoreButton>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <div className="flex min-h-11 items-start gap-2.5 py-1">
                                <Checkbox
                                    id={consentInputId}
                                    name="consent"
                                    value="1"
                                    required
                                    disabled={processing}
                                    aria-invalid={
                                        Boolean(errors.consent) || undefined
                                    }
                                    aria-describedby={
                                        consentDescribedBy || undefined
                                    }
                                    className="mt-0.5 size-4"
                                />
                                <Label
                                    htmlFor={consentInputId}
                                    className="cursor-pointer text-xs leading-relaxed font-normal text-muted-foreground"
                                >
                                    Autorizo o envio de comunicados comerciais
                                    nos termos da LGPD. A inscrição requer
                                    confirmação por e-mail (double opt-in) e
                                    pode ser cancelada a qualquer momento.
                                </Label>
                            </div>

                            <InputError
                                id={consentErrorId}
                                message={errors.consent}
                            />
                        </div>
                    </>
                );
            }}
        </Form>
    );
}

export default NewsletterForm;
