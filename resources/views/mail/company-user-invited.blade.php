<x-mail::message>
# Você foi convidado

O administrador da empresa **{{ $customer->trade_name ?? $customer->legal_name }}** criou um acesso para você. Defina a sua senha para entrar.

<x-mail::button :url="$setPasswordUrl">
Definir senha
</x-mail::button>

Se você não esperava este convite, ignore este e-mail.

Obrigado,<br>
{{ config('app.name') }}
</x-mail::message>
