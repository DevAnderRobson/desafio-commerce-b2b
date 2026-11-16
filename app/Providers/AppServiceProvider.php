<?php

namespace App\Providers;

use App\Checkout\CepLookup;
use App\Checkout\FreightCalculator;
use App\Checkout\SimulatedFreightCalculator;
use App\Checkout\ViaCepLookup;
use App\Models\User;
use App\Payments\PaymentGateway;
use App\Payments\SimulatedPaymentGateway;
use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(FreightCalculator::class, SimulatedFreightCalculator::class);
        $this->app->bind(CepLookup::class, ViaCepLookup::class);
        $this->app->bind(PaymentGateway::class, SimulatedPaymentGateway::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureShopAbilities();
        $this->configureRateLimiting();
    }

    protected function configureRateLimiting(): void
    {
        RateLimiter::for('search', fn (Request $request): Limit => Limit::perMinute(120)->by($request->user()?->id ?: $request->ip()));
        RateLimiter::for('reviews', fn (Request $request): Limit => Limit::perMinute(10)->by($request->user()?->id ?: $request->ip()));
        RateLimiter::for('cart', fn (Request $request): Limit => Limit::perMinute(60)->by($request->user()?->id ?: $request->ip()));
        RateLimiter::for('cep', fn (Request $request): Limit => Limit::perMinute(30)->by($request->user()?->id ?: $request->ip()));
        RateLimiter::for('newsletter', fn (Request $request): Limit => Limit::perMinute(5)->by($request->ip()));
    }

    /**
     * Purchase rules for the storefront: prices and cart need an approved company,
     * and checkout additionally requires the company not to be blocked.
     */
    protected function configureShopAbilities(): void
    {
        Gate::define('view-prices', fn (User $user): bool => $user->customer?->isApproved() ?? false);

        Gate::define('manage-company-users', fn (User $user): bool => $user->isCompanyOwner()
            && ($user->customer?->isApproved() ?? false));

        Gate::define('checkout', fn (User $user): bool => ($user->customer?->isApproved() ?? false)
            && ! $user->customer->is_blocked);
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
