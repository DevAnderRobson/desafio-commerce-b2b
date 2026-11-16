<x-mail::message>
# Pagamento não concluído

O pagamento do pedido **{{ $order->number }}** não foi concluído. Nenhum valor foi cobrado e os itens foram liberados.

Você pode tentar outra condição de pagamento sem refazer o pedido.

<x-mail::button :url="route('orders.confirmation', $order->number)">
Tentar novamente
</x-mail::button>

Obrigado,<br>
{{ config('app.name') }}
</x-mail::message>
