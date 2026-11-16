<x-mail::message>
# Pedido confirmado

Recebemos o pagamento do pedido **{{ $order->number }}** no valor de **{{ \App\Support\Brl::format($order->total_cents) }}** ({{ $order->payment_term_label }}).

Você pode acompanhar o andamento a qualquer momento na área do cliente.

<x-mail::button :url="route('orders.confirmation', $order->number)">
Ver pedido
</x-mail::button>

Obrigado,<br>
{{ config('app.name') }}
</x-mail::message>
