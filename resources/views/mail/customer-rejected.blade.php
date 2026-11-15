<x-mail::message>
# Retorno sobre o seu cadastro

@if ($template === \App\Enums\RejectionTemplate::DuplicateOwner)
Já existe uma empresa com este CNPJ no sistema. Peça ao administrador da empresa para criar o seu acesso pelo painel de usuários.
@else
Não foi possível aprovar o seu cadastro neste momento.
@endif

Em caso de dúvidas, responda a este e-mail.

Obrigado,<br>
{{ config('app.name') }}
</x-mail::message>
