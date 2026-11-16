<?php

use App\Http\Controllers\AddressController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CepController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\NewsletterController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\WishlistController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Storefront routes
|--------------------------------------------------------------------------
|
| Public catalog pages (home, search, product detail) and the purchase funnel
| (cart, checkout). Customer-only routes are added here as each wave lands.
|
*/

Route::get('/', HomeController::class)->name('home');

Route::middleware('throttle:search')->group(function () {
    Route::get('buscar', [SearchController::class, 'index'])->name('search.index');
    Route::get('buscar/sugestoes', [SearchController::class, 'suggest'])->name('search.suggest');
    Route::get('categorias/{category:slug}', [CategoryController::class, 'show'])->name('categories.show');
});

Route::get('produtos/{slug}', [ProductController::class, 'show'])
    ->middleware('throttle:search')
    ->name('products.show');

Route::middleware('auth')->group(function () {
    Route::get('carrinho', [CartController::class, 'show'])->name('cart.show');
    Route::post('carrinho/itens', [CartController::class, 'store'])->middleware('throttle:cart')->name('cart.items.store');
    Route::patch('carrinho/itens/{item}', [CartController::class, 'update'])->middleware('throttle:cart')->name('cart.items.update');
    Route::delete('carrinho/itens/{item}', [CartController::class, 'destroy'])->name('cart.items.destroy');
    Route::delete('carrinho', [CartController::class, 'clear'])->name('cart.clear');

    Route::prefix('checkout')->group(function () {
        Route::get('entrega', [CheckoutController::class, 'delivery'])->name('checkout.delivery');
        Route::put('entrega', [CheckoutController::class, 'confirm'])->name('checkout.delivery.confirm');
        Route::post('enderecos', [AddressController::class, 'store'])->name('addresses.store');
        Route::put('enderecos/{address}', [AddressController::class, 'update'])->name('addresses.update');
        Route::delete('enderecos/{address}', [AddressController::class, 'destroy'])->name('addresses.destroy');
        Route::get('cep/{cep}', CepController::class)->middleware('throttle:cep')->name('checkout.cep');
    });

    Route::post('lista-de-desejos/{product}', [WishlistController::class, 'store'])->name('wishlist.store');
    Route::delete('lista-de-desejos/{product}', [WishlistController::class, 'destroy'])->name('wishlist.destroy');
    Route::match(['post', 'put'], 'produtos/{product}/avaliacoes', [ReviewController::class, 'store'])
        ->middleware('throttle:reviews')
        ->name('reviews.store');
});

Route::post('newsletter', [NewsletterController::class, 'store'])
    ->middleware('throttle:newsletter')
    ->name('newsletter.store');
Route::get('newsletter/{subscription}/confirmar', [NewsletterController::class, 'confirm'])
    ->middleware('signed')
    ->name('newsletter.confirm');
Route::get('newsletter/{subscription}/cancelar', [NewsletterController::class, 'unsubscribe'])
    ->middleware('signed')
    ->name('newsletter.unsubscribe');
