import type { InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { BreadcrumbItem, NavItem } from '@/types/navigation';

export type ProductPriceVisibilityStatus =
    | 'guest'
    | 'pending_approval'
    | 'unavailable_for_model'
    | 'available';

export type ProductPriceState =
    | {
          status: 'guest';
          loginHref?: NonNullable<InertiaLinkProps['href']>;
          message?: string;
      }
    | {
          status: 'pending_approval';
          message?: string;
      }
    | {
          status: 'unavailable_for_model';
          purchaseModelName?: string;
          message?: string;
      }
    | {
          status: 'available';
          /** Preço unitário vigente em centavos (inteiro). */
          unitPriceCents: number;
          /** Preço unitário original sem promoção em centavos (inteiro), quando em promoção. */
          originalPriceCents?: number | null;
          /** Percentual de desconto promocional do item (ex.: 15 para 15%). */
          discountPercent?: number | null;
          /** Preço de atacado em centavos (inteiro), quando aplicável. */
          wholesalePriceCents?: number | null;
          /** Quantidade mínima para ativar o preço de atacado. */
          wholesaleMinQuantity?: number | null;
          /** Economia unitária calculada em centavos (inteiro), opcional. */
          savingsCents?: number | null;
      };

export type CheckoutStepId =
    | 'cart'
    | 'shipping'
    | 'payment'
    | 'processing'
    | 'confirmation';

export type CheckoutStep = {
    id: CheckoutStepId;
    label: string;
    shortLabel?: string;
    href?: NonNullable<InertiaLinkProps['href']>;
};

export type StoreLayoutProps = {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    navItems?: NavItem[];
    searchQuery?: string;
    searchPlaceholder?: string;
    searchSlot?: ReactNode;
    cartHref?: NonNullable<InertiaLinkProps['href']>;
    cartCount?: number;
    cartSlot?: ReactNode;
    accountHref?: NonNullable<InertiaLinkProps['href']>;
    accountSlot?: ReactNode;
    mobileMenuSlot?: ReactNode;
    subHeaderSlot?: ReactNode;
    newsletterSlot?: ReactNode;
    footerSlot?: ReactNode;
    mobileBottomBar?: ReactNode;
    fullWidth?: boolean;
    containerClassName?: string;
};

export type CheckoutLayoutProps = {
    children: ReactNode;
    currentStep?: CheckoutStepId;
    steps?: CheckoutStep[];
    backHref?: NonNullable<InertiaLinkProps['href']>;
    backLabel?: string;
    headerActionsSlot?: ReactNode;
    summarySlot?: ReactNode;
    mobileBottomBar?: ReactNode;
    containerClassName?: string;
};

export type AccountLayoutProps = {
    children: ReactNode;
    title?: string;
    description?: string;
    breadcrumbs?: BreadcrumbItem[];
    navItems?: NavItem[];
    showCompanyUsers?: boolean;
    withStoreHeader?: boolean;
    headerActionsSlot?: ReactNode;
    sidebarFooterSlot?: ReactNode;
    mobileBottomBar?: ReactNode;
};

export type EmptyStateProps = {
    icon?: LucideIcon;
    title: string;
    description: string;
    headingLevel?: 'h2' | 'h3';
    actionLabel?: string;
    actionHref?: NonNullable<InertiaLinkProps['href']>;
    onAction?: () => void;
    secondaryAction?: ReactNode;
    children?: ReactNode;
    className?: string;
};
