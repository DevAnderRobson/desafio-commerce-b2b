<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Customer account area
|--------------------------------------------------------------------------
|
| Everything a logged-in company user manages: dashboard, orders, addresses,
| company users and wishlist. Profile and security settings live in settings.php.
|
*/

Route::redirect('dashboard', '/conta', 301);

Route::middleware(['auth', 'verified'])
    ->prefix('conta')
    ->name('account.')
    ->group(function () {
        Route::inertia('/', 'account/dashboard')->name('dashboard');
    });
