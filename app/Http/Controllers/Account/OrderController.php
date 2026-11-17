<?php

namespace App\Http\Controllers\Account;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Orders\OrderPresenter;
use App\Orders\OrderRepeater;
use App\Support\PersonName;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    private const PER_PAGE = 10;

    /**
     * Status groups behind the list filter.
     *
     * @var array<string, array{label: string, statuses: list<OrderStatus>}>
     */
    private const FILTERS = [
        'all' => ['label' => 'Todos', 'statuses' => []],
        'awaiting_payment' => ['label' => 'Aguardando pagamento', 'statuses' => [OrderStatus::PendingPayment]],
        'in_progress' => ['label' => 'Em andamento', 'statuses' => [OrderStatus::Paid, OrderStatus::Picking, OrderStatus::Shipped]],
        'delivered' => ['label' => 'Entregues', 'statuses' => [OrderStatus::Delivered]],
        'not_completed' => ['label' => 'Não concluídos', 'statuses' => [OrderStatus::PaymentRefused, OrderStatus::PaymentFailed, OrderStatus::Expired, OrderStatus::Cancelled]],
    ];

    public function __construct(private OrderPresenter $presenter) {}

    public function index(Request $request): Response
    {
        $customerId = $request->user()->customer_id;
        $requested = $request->query('status');
        $filter = is_string($requested) && isset(self::FILTERS[$requested]) ? $requested : 'all';

        $orders = $this->scoped($customerId, $filter)
            ->with(['items', 'user'])
            ->latest('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        return Inertia::render('account/orders/index', [
            'orders' => [
                'data' => array_values($orders->getCollection()->map(fn (Order $order): array => $this->presenter->listItem($order))->all()),
                'currentPage' => $orders->currentPage(),
                'lastPage' => $orders->lastPage(),
                'total' => $orders->total(),
                'nextPageUrl' => $orders->nextPageUrl(),
                'prevPageUrl' => $orders->previousPageUrl(),
            ],
            'filter' => $filter,
            'filters' => array_map(
                fn (string $value): array => [
                    'value' => $value,
                    'label' => self::FILTERS[$value]['label'],
                    'count' => $this->scoped($customerId, $value)->count(),
                ],
                array_keys(self::FILTERS),
            ),
            'routes' => [
                'self' => route('account.orders.index', absolute: false),
                'shop' => route('search.index', absolute: false),
            ],
        ]);
    }

    public function show(Request $request, Order $order): Response
    {
        $this->authorizeOrder($request, $order);
        $order->loadMissing('user');

        return Inertia::render('account/orders/show', [
            'order' => [...$this->presenter->tracking($order), 'placedBy' => PersonName::short($order->user->name)],
            'routes' => [
                'list' => route('account.orders.index', absolute: false),
                'repeat' => route('account.orders.repeat', $order->number, false),
                'payment' => $order->status->isPaymentFinal()
                    ? route('orders.confirmation', $order->number, false)
                    : route('orders.processing', $order->number, false),
            ],
        ]);
    }

    public function repeat(Request $request, Order $order, OrderRepeater $repeater): RedirectResponse
    {
        $this->authorizeOrder($request, $order);

        $result = $repeater->repeat($request->user(), $order);
        $notes = [];

        if ($result->adjusted !== []) {
            $notes[] = 'Quantidade ajustada ao estoque: '.implode(', ', $result->adjusted).'.';
        }

        if ($result->skipped !== []) {
            $notes[] = 'Não foi possível adicionar: '.implode(', ', $result->skipped).'.';
        }

        $message = $result->added > 0
            ? trim(($result->added === 1 ? '1 item adicionado ao carrinho.' : "{$result->added} itens adicionados ao carrinho.").' '.implode(' ', $notes))
            : 'Nenhum item do pedido pôde ser adicionado ao carrinho. '.implode(' ', $notes);

        Inertia::flash('toast', ['type' => $result->added > 0 && $result->skipped === [] ? 'success' : 'warning', 'message' => $message]);

        return to_route('cart.show');
    }

    /**
     * @return Builder<Order>
     */
    private function scoped(?int $customerId, string $filter): Builder
    {
        $query = Order::query()->where('customer_id', $customerId);
        $statuses = self::FILTERS[$filter]['statuses'];

        return $statuses === [] ? $query : $query->whereIn('status', $statuses);
    }

    private function authorizeOrder(Request $request, Order $order): void
    {
        abort_unless($order->customer_id === $request->user()->customer_id, 403);
    }
}
