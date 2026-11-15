<?php

use App\Http\Controllers\Account\CompanyUserController;
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
        Route::inertia('aguardando-aprovacao', 'account/pending-approval')->name('pending-approval');

        Route::get('usuarios', [CompanyUserController::class, 'index'])->name('users.index');
        Route::post('usuarios', [CompanyUserController::class, 'store'])
            ->middleware('throttle:10,1')
            ->name('users.store');
    });
