import { toast as sonnerToast, type ExternalToast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import type { FlashToast } from '@/types/ui';

export type StoreToastOptions = Omit<ExternalToast, 'action'> & {
    description?: string;
    /** Ação opcional de recuperação (ex.: "Tentar novamente" em caso de erro). */
    recoveryAction?: {
        label: string;
        onClick: () => void;
    };
};

function buildSonnerOptions(options?: StoreToastOptions): ExternalToast {
    if (!options) {
        return {};
    }

    const { recoveryAction, ...rest } = options;

    if (!recoveryAction) {
        return rest;
    }

    return {
        ...rest,
        action: {
            label: recoveryAction.label,
            onClick: recoveryAction.onClick,
        },
    };
}

export const storeToast = {
    success(message: string, options?: StoreToastOptions) {
        return sonnerToast.success(message, buildSonnerOptions(options));
    },
    error(message: string, options?: StoreToastOptions) {
        return sonnerToast.error(message, buildSonnerOptions(options));
    },
    warning(message: string, options?: StoreToastOptions) {
        return sonnerToast.warning(message, buildSonnerOptions(options));
    },
    info(message: string, options?: StoreToastOptions) {
        return sonnerToast.info(message, buildSonnerOptions(options));
    },
    fromFlash(flashToast: FlashToast, options?: StoreToastOptions) {
        return sonnerToast[flashToast.type](
            flashToast.message,
            buildSonnerOptions(options),
        );
    },
    dismiss: sonnerToast.dismiss,
};

export { Toaster, sonnerToast as toast };
export default Toaster;
