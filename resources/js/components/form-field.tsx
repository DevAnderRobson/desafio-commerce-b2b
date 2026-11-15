import { useId } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type FormFieldProps = Omit<ComponentProps<'input'>, 'id'> & {
    id?: string;
    label: string;
    error?: string;
    hint?: string;
    optional?: boolean;
    optionalLabel?: string;
    containerClassName?: string;
    labelClassName?: string;
    labelAction?: ReactNode;
    startAdornment?: ReactNode;
    endAdornment?: ReactNode;
    children?: ReactNode;
};

/**
 * Campo de formulário com label sempre visível, mensagem de erro associada
 * via aria-describedby e alvo de toque mínimo de 44px.
 */
export function FormField({
    id,
    label,
    error,
    hint,
    optional = false,
    optionalLabel = 'Opcional',
    containerClassName,
    labelClassName,
    labelAction,
    startAdornment,
    endAdornment,
    className,
    children,
    'aria-describedby': ariaDescribedByProp,
    ...inputProps
}: FormFieldProps) {
    const generatedId = useId();
    const fieldId = id ?? `field-${generatedId}`;
    const hintId = `${fieldId}-hint`;
    const errorId = `${fieldId}-error`;

    const describedByIds = [
        ariaDescribedByProp,
        hint ? hintId : undefined,
        error ? errorId : undefined,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={cn('flex flex-col gap-1.5', containerClassName)}>
            <div className="flex items-baseline justify-between gap-2">
                <Label
                    htmlFor={fieldId}
                    className={cn(
                        'text-sm leading-snug font-medium text-foreground',
                        labelClassName,
                    )}
                >
                    <span>{label}</span>
                    {optional && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                            ({optionalLabel})
                        </span>
                    )}
                </Label>
                {labelAction && <div className="shrink-0">{labelAction}</div>}
            </div>

            {children ? (
                children
            ) : startAdornment || endAdornment ? (
                <div className="relative flex items-center">
                    {startAdornment && (
                        <div className="pointer-events-none absolute left-3 flex items-center text-muted-foreground">
                            {startAdornment}
                        </div>
                    )}
                    <Input
                        id={fieldId}
                        aria-invalid={Boolean(error) || undefined}
                        aria-describedby={describedByIds || undefined}
                        className={cn(
                            startAdornment && 'pl-10',
                            endAdornment && 'pr-10',
                            className,
                        )}
                        {...inputProps}
                    />
                    {endAdornment && (
                        <div className="absolute right-2 flex items-center">
                            {endAdornment}
                        </div>
                    )}
                </div>
            ) : (
                <Input
                    id={fieldId}
                    aria-invalid={Boolean(error) || undefined}
                    aria-describedby={describedByIds || undefined}
                    className={className}
                    {...inputProps}
                />
            )}

            {hint && !error && (
                <p id={hintId} className="text-xs text-muted-foreground">
                    {hint}
                </p>
            )}

            <InputError id={errorId} message={error} />
        </div>
    );
}

export default FormField;
