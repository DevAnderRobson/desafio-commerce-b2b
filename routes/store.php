<?php

use App\Http\Controllers\HomeController;
use App\Http\Controllers\NewsletterController;
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

Route::post('newsletter', [NewsletterController::class, 'store'])
    ->middleware('throttle:newsletter')
    ->name('newsletter.store');
Route::get('newsletter/{subscription}/confirmar', [NewsletterController::class, 'confirm'])
    ->middleware('signed')
    ->name('newsletter.confirm');
Route::get('newsletter/{subscription}/cancelar', [NewsletterController::class, 'unsubscribe'])
    ->middleware('signed')
    ->name('newsletter.unsubscribe');
