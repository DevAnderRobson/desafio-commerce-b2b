<?php

namespace App\Http\Controllers;

use App\Http\Requests\SearchRequest;
use App\Search\ProductSearch;
use App\Search\SearchPage;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class SearchController extends Controller
{
    public function index(SearchRequest $request, SearchPage $page): Response
    {
        return Inertia::render('store/search', $page->props($request));
    }

    /**
     * Navbar suggestions: at most 5 products and never any price.
     */
    public function suggest(SearchRequest $request, ProductSearch $search): JsonResponse
    {
        $term = trim((string) $request->validated('q'));
        $result = $search->suggest($term);

        return response()->json([
            'query' => $term,
            'total' => $result['total'],
            'items' => array_map(function ($product): array {
                $image = $product->images->first();

                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'brand' => $product->brand ?? '',
                    'slug' => $product->slug,
                    'href' => '/produtos/'.$product->slug,
                    'categoryName' => $product->category->name,
                    'imageUrl' => $image !== null ? asset($image->path) : null,
                    'imageAlt' => $image !== null ? $image->alt : $product->name,
                ];
            }, $result['items']),
        ]);
    }
}
