<x-mail::message>
# Cadastro aprovado

O cadastro da empresa **{{ $customer->trade_name ?? $customer->legal_name }}** foi aprovado. A partir de agora você já pode ver os preços e realizar compras.

<x-mail::button :url="route('login')">
Acessar a loja
</x-mail::button>

Obrigado,<br>
{{ config('app.name') }}
</x-mail::message>
