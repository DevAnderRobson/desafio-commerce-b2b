# Onda 5: Carrinho e navbar

Status: 🟨 (implementada; revisão visual pendente) · Depende de: ondas 1 e 4 (botão adicionar)

## Objetivo

Carrinho persistente **por usuário** e navbar com contador animado em tempo real.

## Tarefas

### 5.1 Backend do carrinho

- [x] `carts`/`cart_items`; um carrinho ativo **por usuário** (D24); usuários da mesma empresa têm carrinhos separados.
- [x] Ações: adicionar (soma quantidade), alterar quantidade, remover, limpar.
- [x] Validar estoque, produto ativo, produto disponível na tabela do cliente, cliente aprovado e não bloqueado a cada operação. Itens que ficarem inválidos depois (ex.: produto desativado) permanecem visíveis, sinalizados e bloqueiam o avanço até serem removidos.
- [x] `CartTotals` (serviço único de totais): subtotal, economia (atacado/promoção por item), frete, acréscimo, total. Reutilizado no checkout. _(frete/acréscimo entram na onda 6)_
- [x] Preços sempre recalculados no servidor; avisar mudança de preço/estoque desde a última visita.
- [x] Testes: totais com atacado e promoção, estoque insuficiente, produto desativado no carrinho, concorrência.

### 5.2 Navbar com contador

- [x] Ícone do carrinho com badge de **quantidade de itens**, compartilhado via props Inertia globais.
- [x] Atualização imediata (otimista) ao adicionar, com animação curta no badge (escala/"pop" de ~200 ms) e confirmação do servidor reconciliando o número.
- [x] `aria-live="polite"` anunciando "N itens no carrinho"; `prefers-reduced-motion` troca a animação por mudança instantânea.
- [x] Opcional: mini carrinho em popover/drawer com os itens e CTA "Ir para o carrinho". _(desktop >= lg; no mobile o botão leva ao carrinho)_
- [x] "Tempo real" entre abas/dispositivos: sincronizar ao focar a janela ou via evento/broadcast (decidir; padrão: revalidar ao focar).
- [x] Navbar: link home, busca ([onda 3](03-busca.md)), conta, carrinho; mobile com menu e busca em overlay.

### 5.3 Página do carrinho

- [x] Lista de itens com imagem, nome, preço unitário e origem do preço, stepper de quantidade, remover (com desfazer).
- [x] Mostrar quanto falta para o preço de atacado ("+12 un. para R$ 2,76 cada").
- [x] Resumo (total, economia) fixo ao lado no desktop e em barra inferior no mobile.
- [x] Avisos: item indisponível, cliente bloqueado. _(limite de crédito depende da condição de pagamento: onda 6/7)_
- [x] Estado vazio com caminho para a loja.
- [x] CTA único: "Continuar para entrega".

## Pontos de atenção

- Contador = soma de **unidades** (decidido; registrar em [03](../03-decisoes-e-pendencias.md) ao implementar).
- Carrinho não reserva estoque (reserva só na criação do pedido).
- Debounce nos steppers de quantidade para não disparar uma requisição por clique, com UI otimista.

## Melhorias futuras

- Salvar para depois; recompra rápida a partir de pedidos anteriores; importar carrinho por planilha/CSV (comum em B2B).

## Definição de pronto

- [ ] Itens marcados · ci:check verde · animação revisada com e sem reduced motion.
