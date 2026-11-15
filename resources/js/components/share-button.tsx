import { Check, Share2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StoreButton } from '@/components/button';
import { storeToast } from '@/components/toast';
import { cn } from '@/lib/utils';

export type ShareButtonProps = {
    /** URL canônica limpa do produto (sem parâmetros de sessão ou preço). */
    canonicalUrl: string;
    /** Título do produto usado na Web Share API. */
    title?: string;
    /** Texto complementar opcional para o compartilhamento nativo. */
    text?: string;
    className?: string;
};

function copyTextFallback(value: string): boolean {
    if (typeof document === 'undefined') {
        return false;
    }

    try {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(textarea);
        return copied;
    } catch {
        return false;
    }
}

/**
 * Botão de compartilhamento do produto (item 4.3):
 * - Usa Web Share API (`navigator.share`) quando disponível no dispositivo.
 * - Fallback: copia a `canonicalUrl` limpa para a área de transferência com
 *   confirmação visual, toast (`storeToast`) e anúncio `aria-live="polite"`.
 * - Alvo de toque >= 44x44px e suporte a teclado/TV.
 */
export function ShareButton({
    canonicalUrl,
    title,
    text,
    className,
}: ShareButtonProps) {
    const [copied, setCopied] = useState(false);
    const [liveMessage, setLiveMessage] = useState('');
    const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (resetTimerRef.current !== null) {
                clearTimeout(resetTimerRef.current);
            }
        };
    }, []);

    const copyCanonicalUrl = useCallback(async () => {
        let didCopy = false;

        if (
            typeof navigator !== 'undefined' &&
            navigator.clipboard &&
            typeof navigator.clipboard.writeText === 'function'
        ) {
            try {
                await navigator.clipboard.writeText(canonicalUrl);
                didCopy = true;
            } catch {
                didCopy = copyTextFallback(canonicalUrl);
            }
        } else {
            didCopy = copyTextFallback(canonicalUrl);
        }

        if (didCopy) {
            setCopied(true);
            setLiveMessage(
                'Link do produto copiado para a área de transferência.',
            );
            storeToast.success(
                'Link do produto copiado para a área de transferência.',
            );

            if (resetTimerRef.current !== null) {
                clearTimeout(resetTimerRef.current);
            }

            resetTimerRef.current = setTimeout(() => {
                setCopied(false);
                setLiveMessage('');
            }, 2500);
        } else {
            setLiveMessage('Não foi possível copiar o link automaticamente.');
            storeToast.error(
                'Não foi possível copiar o link. Copie o endereço diretamente da barra do navegador.',
            );
        }
    }, [canonicalUrl]);

    const handleShare = useCallback(async () => {
        if (
            typeof navigator !== 'undefined' &&
            typeof navigator.share === 'function'
        ) {
            try {
                await navigator.share({
                    title,
                    text,
                    url: canonicalUrl,
                });
                setLiveMessage('Opções de compartilhamento abertas.');
                return;
            } catch (error) {
                if (
                    error instanceof DOMException &&
                    error.name === 'AbortError'
                ) {
                    return;
                }
            }
        }

        await copyCanonicalUrl();
    }, [canonicalUrl, copyCanonicalUrl, text, title]);

    return (
        <>
            <StoreButton
                type="button"
                variant="outline"
                size="touch"
                onClick={() => void handleShare()}
                aria-label={
                    copied
                        ? 'Link do produto copiado'
                        : `Compartilhar ${title ?? 'produto'}`
                }
                className={cn('gap-2', className)}
            >
                {copied ? (
                    <Check
                        className="size-4 shrink-0 text-success"
                        aria-hidden="true"
                    />
                ) : (
                    <Share2 className="size-4 shrink-0" aria-hidden="true" />
                )}
                <span>{copied ? 'Link copiado' : 'Compartilhar'}</span>
            </StoreButton>

            <span
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
            >
                {liveMessage}
            </span>
        </>
    );
}

export default ShareButton;
