<?php

namespace App\Http\Middleware;

use App\Cart\CartPresenter;
use App\Cart\CartService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
            ],
            'company' => $this->company($request),
            'miniCart' => Inertia::optional(fn (): ?array => $request->user() === null ? null : app(CartPresenter::class)->mini($request->user())),
            'cart' => fn (): array => ['count' => $request->user() === null ? 0 : app(CartService::class)->unitCount($request->user())],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }

    /**
     * Company context used to explain why prices or purchases are unavailable. Prices and
     * credit figures are never shared here.
     *
     * @return array{name: string, approval_status: string, is_blocked: bool, is_owner: bool}|null
     */
    private function company(Request $request): ?array
    {
        $customer = $request->user()?->customer;

        if ($customer === null) {
            return null;
        }

        return [
            'name' => $customer->trade_name ?? $customer->legal_name,
            'approval_status' => $customer->approval_status->value,
            'is_blocked' => $customer->is_blocked,
            'is_owner' => $request->user()->isCompanyOwner(),
        ];
    }
}
