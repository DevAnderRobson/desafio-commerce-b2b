<?php

use App\Http\Controllers\Account\AddressController;
use App\Http\Controllers\Account\CompanyUserController;
use App\Http\Controllers\Account\DashboardController;
use App\Http\Controllers\Account\OrderController;
use App\Http\Controllers\Account\WishlistController;
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
        Route::get('/', DashboardController::class)->name('dashboard');
        Route::inertia('aguardando-aprovacao', 'account/pending-approval')->name('pending-approval');

        Route::get('pedidos', [OrderController::class, 'index'])->name('orders.index');
        Route::get('pedidos/{order:number}', [OrderController::class, 'show'])->name('orders.show');
        Route::post('pedidos/{order:number}/repetir', [OrderController::class, 'repeat'])->middleware('throttle:cart')->name('orders.repeat');

        Route::get('enderecos', [AddressController::class, 'index'])->name('addresses.index');
        Route::post('enderecos', [AddressController::class, 'store'])->name('addresses.store');
        Route::put('enderecos/{address}', [AddressController::class, 'update'])->name('addresses.update');
        Route::delete('enderecos/{address}', [AddressController::class, 'destroy'])->name('addresses.destroy');

        Route::get('desejos', [WishlistController::class, 'index'])->name('wishlist.index');
        Route::post('desejos/{product}/mover', [WishlistController::class, 'move'])->middleware('throttle:cart')->name('wishlist.move');

        Route::get('usuarios', [CompanyUserController::class, 'index'])->name('users.index');
        Route::post('usuarios', [CompanyUserController::class, 'store'])
            ->middleware('throttle:10,1')
            ->name('users.store');
    });
