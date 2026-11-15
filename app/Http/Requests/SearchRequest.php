<?php

namespace App\Http\Requests;

use App\Search\SearchFilters;
use App\Search\SearchSort;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SearchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, ValidationRule|string>>
     */
    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:100'],
            'brand' => ['nullable', 'string', 'max:100'],
            'sort' => ['nullable', Rule::enum(SearchSort::class)],
            'page' => ['nullable', 'integer', 'min:1', 'max:1000'],
        ];
    }

    /**
     * Price sorting needs the customer's price table, so it is only honoured for approved companies.
     */
    public function filters(?string $fixedCategorySlug = null): SearchFilters
    {
        $customer = $this->user()?->customer;
        $priceTableId = $customer !== null && $customer->isApproved() ? $customer->price_table_id : null;
        $sort = SearchSort::tryFrom((string) $this->validated('sort')) ?? SearchSort::Relevance;

        if ($sort->needsPrice() && $priceTableId === null) {
            $sort = SearchSort::Relevance;
        }

        return new SearchFilters(
            term: trim((string) $this->validated('q')),
            categorySlug: $fixedCategorySlug ?? ($this->validated('category') ?: null),
            brand: $this->validated('brand') ?: null,
            sort: $sort,
            priceTableId: $priceTableId,
        );
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public function sortOptions(): array
    {
        $customer = $this->user()?->customer;
        $canSortByPrice = $customer !== null && $customer->isApproved() && $customer->price_table_id !== null;

        return array_values(array_map(
            fn (SearchSort $sort): array => ['value' => $sort->value, 'label' => $sort->label()],
            array_filter(SearchSort::cases(), fn (SearchSort $sort): bool => $canSortByPrice || ! $sort->needsPrice()),
        ));
    }
}
