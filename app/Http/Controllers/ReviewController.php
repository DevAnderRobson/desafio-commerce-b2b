<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreReviewRequest;
use App\Models\Product;
use App\Models\Review;
use App\Reviews\PurchaseVerifier;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class ReviewController extends Controller
{
    public function __construct(private PurchaseVerifier $purchases) {}

    /**
     * Creates the user's review or edits the existing one (one per user and product).
     */
    public function store(StoreReviewRequest $request, Product $product): RedirectResponse
    {
        abort_unless($product->is_active, 404);

        $user = $request->user();

        Review::query()->updateOrCreate(
            ['product_id' => $product->id, 'user_id' => $user->id],
            [
                ...$request->validated(),
                'verified_purchase' => $this->purchases->hasDeliveredPurchase($user, $product),
            ],
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Avaliação salva. Obrigado!']);

        return back();
    }
}
