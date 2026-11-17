<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\Order;
use App\Models\WishlistItem;
use App\Orders\OrderPresenter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(private OrderPresenter $orders) {}

    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $customer = $user->customer?->loadMissing('priceTable');
        $approved = $customer?->isApproved() ?? false;

        return Inertia::render('account/dashboard', [
            'accountCompany' => $customer === null ? null : [
                'name' => $customer->trade_name ?? $customer->legal_name,
                'purchaseModel' => match ($customer->priceTable?->code) {
                    'PADRAO' => 'Padrão',
                    'ATACADISTA' => 'Atacadista',
                    default => $customer->priceTable?->description,
                },
                'approvalStatus' => $customer->approval_status->value,
                'isBlocked' => $customer->is_blocked,
                'isOwner' => $user->isCompanyOwner(),
            ],
            'credit' => $approved ? [
                'limitCents' => $customer->credit_limit_cents,
                'usedCents' => $customer->credit_used_cents,
                'availableCents' => $customer->availableCreditCents(),
            ] : null,
            'recentOrders' => $customer === null ? [] : array_values(Order::query()
                ->where('customer_id', $customer->id)
                ->with(['items', 'user'])
                ->latest('id')
                ->limit(5)
                ->get()
                ->map(fn (Order $order): array => $this->orders->listItem($order))
                ->all()),
            'counts' => [
                'orders' => $customer === null ? 0 : Order::query()->where('customer_id', $customer->id)->count(),
                'addresses' => $customer === null ? 0 : Address::query()->where('customer_id', $customer->id)->count(),
                'wishlist' => WishlistItem::query()->where('user_id', $user->id)->count(),
            ],
            'routes' => [
                'orders' => route('account.orders.index', absolute: false),
                'addresses' => route('account.addresses.index', absolute: false),
                'wishlist' => route('account.wishlist.index', absolute: false),
                'users' => $user->isCompanyOwner() ? route('account.users.index', absolute: false) : null,
                'settings' => route('profile.edit', absolute: false),
                'shop' => route('search.index', absolute: false),
            ],
        ]);
    }
}
