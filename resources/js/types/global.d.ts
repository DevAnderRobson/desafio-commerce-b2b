import type { Auth, CompanyContext } from '@/types/auth';
import type { SharedCart } from '@/types/cart';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            company: CompanyContext | null;
            cart?: SharedCart;
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}
