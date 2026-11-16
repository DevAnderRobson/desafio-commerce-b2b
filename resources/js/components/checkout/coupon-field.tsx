import { Tag } from 'lucide-react';
import { useId } from 'react';
import { StoreButton } from '@/components/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { CouponFieldProps } from '@/types/checkout-ui';

/**
 * Campo visual de cupom de desconto (Onda 6 - item 6.3 / D20):
 * - Estritamente visual e permanentemente desativado (`disabled` + `aria-disabled="true"`).
 * - Sem estado, sem requisição ao backend e sem inclusão em payloads do checkout.
 * - Mantém contraste legível no estado desabilitado e texto de apoio discreto "Em breve".
 */
export function CouponField({ className }: CouponFieldProps) {
    const inputId = useId();
    const helperId = `${inputId}-helper`;

    return (
        <div className={cn('flex flex-col gap-2', className)}>
            <div className="flex items-center justify-between gap-2">
                <Label
                    htmlFor={inputId}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground"
                >
                    <Tag
                        className="size-3.5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                    />
                    <span>Cupom de desconto</span>
                </Label>
                <span
                    id={helperId}
                    className="inline-flex items-center rounded-sm border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                >
                    Em breve
                </span>
            </div>

            <div className="flex items-center gap-2">
                <Input
                    id={inputId}
                    type="text"
                    disabled
                    aria-disabled="true"
                    aria-describedby={helperId}
                    placeholder="Código promocional corporativo"
                    className="min-h-11 flex-1 bg-muted/60 text-muted-foreground placeholder:text-muted-foreground/80 disabled:opacity-75"
                />
                <StoreButton
                    type="button"
                    variant="outline"
                    size="touch"
                    disabled
                    aria-disabled="true"
                    aria-describedby={helperId}
                    className="shrink-0 bg-muted/50 text-muted-foreground disabled:opacity-75"
                >
                    Aplicar
                </StoreButton>
            </div>
        </div>
    );
}

export default CouponField;
