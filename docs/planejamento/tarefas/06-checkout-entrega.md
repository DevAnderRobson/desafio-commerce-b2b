# Onda 6: Checkout, etapa de entrega

Status: 🟨 (implementada; revisão visual pendente; pagamento na onda 7) · Depende de: onda 5

## Objetivo

Etapa única de **endereço e frete** (com o campo de cupom apenas visual e desativado), sem o cliente sair da tela.

## Tarefas

### 6.1 Endereço inline

- [x] Tabela `addresses` por **empresa** (compartilhada entre os usuários dela) com `last_used_at`.
- [x] Sem endereço cadastrado: formulário de cadastro rápido **dentro** da tela, sem navegação.
- [x] Com endereços: **último usado pré-selecionado**; opção de escolher outro da lista ou cadastrar novo (formulário em painel/drawer na mesma tela).
- [x] Preenchimento por CEP (consulta de CEP com fallback manual se falhar); máscara e validação de CEP/UF.
- [x] Campos mínimos, labels visíveis, `autocomplete` de endereço.
- [x] Editar/remover endereço (remover não afeta pedidos antigos: pedido guarda snapshot).
- [x] Testes: primeiro endereço, pré-seleção do último usado, troca, criação de novo, endereço de outra empresa (403).

### 6.2 Frete

- [x] Contrato `FreightCalculator` (entrada: itens, endereço; saída: opções com preço e prazo) com implementação simulada por UF/faixa de valor.
- [x] Recalcular ao trocar endereço ou alterar o carrinho; mostrar estado de carregamento e erro com nova tentativa.
- [x] Opção selecionada persiste no checkout; frete grátis acima de valor em configuração única (ex.: `config/shop.php`).
- [x] Testes: cálculo por UF, endereço inválido, serviço indisponível.

### 6.3 Campo de cupom (somente visual, desativado)

> **Cupons estão fora do escopo deste projeto (D20).** O campo existe apenas como elemento da identidade visual, sinalizando algo que poderá ser implementado no futuro. **Não implementar lógica, rota, tabela, validação, seeder nem testes de cupom.**

- [x] Campo "Cupom de desconto" e botão "Aplicar" renderizados no checkout (e, se fizer sentido no layout, no resumo do carrinho) **desativados** (`disabled`, `aria-disabled`), com texto de apoio discreto como "Em breve".
- [x] Sem requisição ao backend, sem estado, sem efeito nos totais; não enviar valor de cupom em nenhum payload.
- [x] Visual coerente com os demais campos (mesmos tokens), contraste do estado desabilitado legível, sem aparência de erro.
- [x] Teste de frontend simples garantindo que o campo e o botão estão desabilitados (opcional, se houver teste de página do checkout).

### 6.4 Tela

- [x] Indicador de etapas; resumo do pedido fixo (desktop) / recolhível (mobile).
- [x] CTA único: "Continuar para pagamento", desabilitado com motivo claro se faltar endereço/frete. _(por enquanto só confirma a entrega; a etapa de pagamento é a onda 7)_
- [x] Preservar dados ao voltar do pagamento.

## Pontos de atenção

- Frete é simulado (D12). Cupom é só visual (D20).
- Validar autorização: endereço sempre pertence à **empresa** do usuário logado.
- Consulta de CEP externa (ex.: ViaCEP) não pode quebrar o fluxo; em testes usar `Http::fake()`.

## Melhorias futuras

- Múltiplos endereços de cobrança x entrega; agendamento de entrega; frete por transportadora real.

## Definição de pronto

- [x] Itens marcados · ci:check verde · fluxo testado em mobile e desktop.
