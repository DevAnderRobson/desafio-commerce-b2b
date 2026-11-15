<?php

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

Route::inertia('/', 'welcome')->name('home');
