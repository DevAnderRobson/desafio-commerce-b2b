<x-mail::message>
# Confirme a sua inscrição

Recebemos um pedido de inscrição deste e-mail no informativo comercial da {{ config('app.name') }}. Para começar a receber avisos de reposição e campanhas de atacado, confirme abaixo.

<x-mail::button :url="$confirmUrl">
Confirmar inscrição
</x-mail::button>

O link vale por 48 horas. Se você não fez este pedido, ignore este e-mail: nenhuma inscrição será ativada.

[Cancelar inscrição]({{ $unsubscribeUrl }})
</x-mail::message>
