<?php

namespace App\Http\Controllers;

use App\Cart\CartPresenter;
use App\Cart\CartService;
use App\Http\Requests\CartItemRequest;
use App\Models\CartItem;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CartController extends Controller
{
    public function __construct(
        private CartService $cart,
        private CartPresenter $presenter,
    ) {}

    public function show(Request $request): Response
    {
        return Inertia::render('store/cart', [
            'cart' => $this->presenter->present($request->user()),
            'routes' => [
                'itemStore' => route('cart.items.store', absolute: false),
                'itemBase' => '/carrinho/itens',
                'clear' => route('cart.clear', absolute: false),
                'checkout' => '/checkout/entrega',
                'shop' => route('search.index', absolute: false),
            ],
        ]);
    }

    public function store(CartItemRequest $request): RedirectResponse
    {
        $product = Product::query()->with('stock')->findOrFail($request->integer('product_id'));

        $this->cart->add($request->user(), $product, $request->integer('quantity'));

        return back();
    }

    public function update(CartItemRequest $request, CartItem $item): RedirectResponse
    {
        $this->authorizeItem($request, $item);
        $this->cart->setQuantity($request->user(), $item->load('product.stock'), $request->integer('quantity'));

        return back();
    }

    public function destroy(Request $request, CartItem $item): RedirectResponse
    {
        $this->authorizeItem($request, $item);
        $this->cart->remove($item);

        return back();
    }

    public function clear(Request $request): RedirectResponse
    {
        $this->cart->clear($request->user());

        return back();
    }

    private function authorizeItem(Request $request, CartItem $item): void
    {
        abort_unless($item->cart->user_id === $request->user()->id, 404);
    }
}
