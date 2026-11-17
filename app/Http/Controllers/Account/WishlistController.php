<?php

namespace App\Http\Controllers\Account;

use App\Cart\CartService;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\WishlistItem;
use App\Storefront\ProductCardPresenter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WishlistController extends Controller
{
    public function index(Request $request, ProductCardPresenter $presenter): Response
    {
        $user = $request->user()->loadMissing('customer.priceTable');

        $products = Product::query()
            ->active()
            ->whereIn('id', WishlistItem::query()->where('user_id', $user->id)->select('product_id'))
            ->with(['category', 'images', 'stock'])
            ->orderByDesc(WishlistItem::query()->select('id')->whereColumn('wishlist_items.product_id', 'products.id')->where('user_id', $user->id)->limit(1))
            ->get();

        return Inertia::render('account/wishlist', [
            'products' => $presenter->presentMany($products, $user),
            'routes' => [
                'moveBase' => '/conta/desejos',
                'removeBase' => '/lista-de-desejos',
                'shop' => route('search.index', absolute: false),
            ],
        ]);
    }

    /**
     * Moves one unit to the cart and takes the product off the wishlist.
     */
    public function move(Request $request, Product $product, CartService $cart): RedirectResponse
    {
        $cart->add($request->user(), $product, 1);

        WishlistItem::query()->where('user_id', $request->user()->id)->where('product_id', $product->id)->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Produto movido para o carrinho.']);

        return back();
    }
}
