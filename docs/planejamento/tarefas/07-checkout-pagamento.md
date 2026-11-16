# Onda 7: Checkout, pagamento assíncrono e acompanhamento

Status: 🟨 (implementada; revisão visual pendente; DLQ e /conta/pedidos abertos) · Depende de: onda 6

## Objetivo

Revisar o pedido, escolher a forma de pagamento e criar o pedido; o pagamento é processado de forma **assíncrona** e o cliente acompanha numa tela temporária, sem travar.

## Tarefas

### 7.1 Revisão e forma de pagamento

- [x] Resumo completo: itens, endereço, frete, economia, acréscimo.
- [x] Listar condições de pagamento: indisponíveis aparecem desabilitadas com o motivo (valor mínimo, limite de crédito insuficiente).
- [x] Acréscimo percentual mostrado e somado ao total ao selecionar a condição.
- [x] Pagamento a prazo: validar `limite_credito - limite_utilizado >= total` (com acréscimo); se estourar, a condição fica **bloqueada** com o motivo e o valor disponível (D21); sugerir PIX.
- [x] CTA único: "Confirmar pedido".
- [x] Testes: valor mínimo, limite estourado, acréscimo, cliente bloqueado, cliente não aprovado.

### 7.2 Criação do pedido

- [x] Em uma transação: revalidar preços, estoque e limite; **reservar estoque e, se a prazo, reservar o limite de crédito da empresa com lock (D30)**; congelar preços/endereço (snapshot); criar `order` (`pending_payment`) e `payment`; gravar `user_id` de quem comprou.
- [x] A chave de idempotência é gerada ao abrir a etapa de pagamento e enviada no confirmar.
- [x] **Chave de idempotência** (duplo clique/reenvio não cria dois pedidos).
- [x] Despachar job de processamento e publicar evento (reaproveitando a mensageria existente).
- [x] Redirecionar imediatamente para a tela de acompanhamento.
- [x] Testes: concorrência de estoque, idempotência, mudança de preço entre carrinho e confirmação.

### 7.3 Processamento assíncrono

- [ ] Job em fila (RabbitMQ já integrado) com tentativas/backoff e DLQ. _(tentativas e backoff feitos; falha definitiva fecha o pedido e devolve reservas; DLQ dedicada do broker ainda não configurada)_
- [x] Gateway **simulado** atrás de interface, com resultados configuráveis (aprovado, recusado, lento, erro transitório).
- [x] Máquina de estados: `aguardando_pagamento → pago | recusado | falhou | expirado`; transições válidas apenas.
- [x] Idempotência no tratamento do retorno do gateway.
- [x] Em falha definitiva: devolver estoque reservado e liberar o limite reservado.
- [x] Comando agendado que expira pedidos `pending_payment` antigos (libera estoque e limite; status `expired`).
- [x] Em sucesso: baixar estoque reservado, confirmar o limite (se a prazo), limpar o carrinho do usuário, publicar `order.paid`, e-mail de confirmação.
- [x] Testes: sucesso, recusa, erro transitório com retry, falha definitiva, reprocessamento duplicado.

### 7.4 Tela temporária de acompanhamento

- [x] `orders.processing`: mensagem clara de "estamos processando seu pagamento; você pode sair desta página", número do pedido, passos.
- [x] Atualização por polling do Inertia (intervalo crescente) ou broadcast; para ao chegar em estado final e leva a `orders.confirmation`.
- [x] Timeout amigável: após X minutos, orientar ("avisaremos por e-mail") sem prender o cliente.
- [x] Acessível: `aria-live` para mudança de estado; sem spinner infinito sem contexto.
- [x] Tela de resultado: sucesso (próximos passos, resumo), recusa (tentar outra forma sem refazer o pedido), pendente.
- [ ] O cliente pode voltar ao pedido depois em `/conta/pedidos`. _(a lista é da onda 8.B)_

### 7.5 Ciclo pós-pagamento (simulado)

- [x] Estados `paid → picking → shipped → delivered` (`delivered_at`), na classe única de estados com transições válidas.
- [x] Comando `orders:advance {order} {status}` (uso de demonstração) para avançar o pedido até existir a gestão da loja. Idem para o seeder demo.
- [x] `delivered` habilita o selo "Comprou" nas avaliações; antes disso, não.
- [x] Testes: transições válidas/inválidas e efeito no selo.

## Pontos de atenção

- Nunca confiar em totais vindos do cliente.
- Pedido criado mesmo se o gateway demorar; estado visível sempre consistente com o banco.
- Reaproveitar a mensageria existente (`app/Messaging`, evento `OrderCreated` já existe) para publicar `order.created`/`order.paid`; consumo e DLQ idempotentes.
- Registrar logs/auditoria de transições sem dados sensíveis.

## Melhorias futuras

- Gateway real, webhooks assinados, PIX com QR e expiração, boleto emitido, notificações push.

## Definição de pronto

- [ ] Itens marcados · ci:check verde · fluxo ponta a ponta demonstrável (feliz e falha) para a apresentação.
