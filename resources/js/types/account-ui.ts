import type {
    AccountCompany,
    AccountCredit,
    OrderFilterValue,
    OrderListItem,
    WishlistProduct,
} from '@/types/account';
import type {
    OrderShipment,
    OrderStatusCode,
    OrderTracking,
} from '@/types/order';

export type ShipmentTrackingProps = {
    shipment: OrderShipment | null;
    status?: OrderStatusCode;
    heading?: string;
    className?: string;
};

export type OrderStatusBadgeProps = {
    status: OrderStatusCode;
    statusLabel: string;
    outcome: OrderTracking['outcome'];
    className?: string;
};

export type CompanyStatusBannerProps = {
    company: AccountCompany | null;
    shopHref: string;
};

export type CompanyCreditPanelProps = {
    credit: AccountCredit;
};

export type OrderFilterTabsProps = {
    filters: { value: OrderFilterValue; label: string; count: number }[];
    activeFilter: OrderFilterValue;
    isFiltering?: boolean;
    onSelectFilter: (status: OrderFilterValue) => void;
};

export type OrdersResponsiveListProps = {
    orders: OrderListItem[];
    compact?: boolean;
};

export type RemovedWishlistItemSnapshot = {
    id: WishlistProduct['id'];
    name: string;
};
