<?php

namespace App\Http\Controllers;

use App\Http\Requests\SearchRequest;
use App\Models\Category;
use App\Search\SearchPage;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    public function show(SearchRequest $request, Category $category, SearchPage $page): Response
    {
        return Inertia::render('store/search', $page->props($request, $category));
    }
}
