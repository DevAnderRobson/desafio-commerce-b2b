# Planejamento: loja B2B (área do cliente)

Índice e acompanhamento das entregas. Fonte dos requisitos: [`../requisito.md`](../requisito.md). Dados de partida: [`../data/`](../data/).

> **Status atual:** somente especificação (decisões de 2026-11-14 incorporadas: busca em 2 modos, preço só para cliente aprovado, aprovação manual, promoção por item, usuários por empresa com dono, CNPJ duplicado sem vazar existência, selo após entrega, dados de exemplo). Nenhuma tarefa abaixo foi implementada. A execução começa quando for solicitada, onda por onda.

## Regra de ouro: `docs/` é só desenvolvimento

Tudo em `docs/` (planejamento, requisito e `docs/data/*.json`) existe **apenas para guiar o desenvolvimento**. A aplicação em execução, os testes e o CI **não** leem nada daqui. Os JSONs são carregados **uma vez** no banco por seeder/importador (D26) e a partir daí **o banco é a fonte de verdade**. Ver [D26](03-decisoes-e-pendencias.md).

## Escopo

> Sistema de **demonstração**: dados ausentes dos JSONs são gerados como exemplo (D12).

- **Agora:** loja do cliente (storefront B2B): home, busca, produto, carrinho, checkout, pagamento assíncrono.
- **Depois (fora desta fase):** gestão da loja (painel administrativo). Ver [onda 9](09-gestao-da-loja-futuro.md).
- As telas atuais de login/cadastro/dashboard/configurações passam a compor a **área do cliente** (onda 8).

## Documentos transversais

| Arquivo                                                    | Conteúdo                                                             |
| ---------------------------------------------------------- | -------------------------------------------------------------------- |
| [00-diretrizes.md](00-diretrizes.md)                       | Impeccable (anti "AI slop"), mobile-first, breakpoints, a11y, motion |
| [01-rotas-e-telas.md](01-rotas-e-telas.md)                 | Mapa de rotas, telas e áreas (loja x conta)                          |
| [02-modelo-de-dados.md](02-modelo-de-dados.md)             | Entidades, relações e regras de negócio derivadas dos JSONs          |
| [03-decisoes-e-pendencias.md](03-decisoes-e-pendencias.md) | Decisões tomadas e perguntas em aberto                               |

## Ondas (tarefas)

Ordem sugerida; cada onda depende das anteriores.

| Onda | Arquivo                                                        | Resumo                                                                    | Status |
| ---- | -------------------------------------------------------------- | ------------------------------------------------------------------------- | ------ |
| 1    | [01-fundacao-e-catalogo.md](tarefas/01-fundacao-e-catalogo.md) | Layout da loja, banco, importação dos JSONs, preço por cliente            | ⬜     |
| 2    | [02-home.md](tarefas/02-home.md)                               | Vitrine, carrosséis, promoções/mais vendidos, newsletter                  | ⬜     |
| 3    | [03-busca.md](tarefas/03-busca.md)                             | Full-text search com debounce de 3 s, listagem, filtros                   | ⬜     |
| 4    | [04-detalhe-do-produto.md](tarefas/04-detalhe-do-produto.md)   | Galeria com zoom, ficha, compartilhar, desejos, avaliações                | ⬜     |
| 5    | [05-carrinho-e-navbar.md](tarefas/05-carrinho-e-navbar.md)     | Carrinho persistente, contador animado no navbar                          | ⬜     |
| 6    | [06-checkout-entrega.md](tarefas/06-checkout-entrega.md)       | Endereço inline, frete (cupom só visual)                                  | ⬜     |
| 7    | [07-checkout-pagamento.md](tarefas/07-checkout-pagamento.md)   | Revisão, pagamento, processamento assíncrono, tela de acompanhamento      | ⬜     |
| 8    | [08-area-do-cliente.md](tarefas/08-area-do-cliente.md)         | 8.A cadastro/aprovação/usuários (logo após a onda 1); 8.B área do cliente | ⬜     |
| 9    | [09-gestao-da-loja-futuro.md](09-gestao-da-loja-futuro.md)     | Painel administrativo (apenas rascunho)                                   | ⬜     |

Legenda: ⬜ não iniciada · 🟨 em andamento · ✅ concluída

## Como manter este acompanhamento

1. Ao iniciar uma onda, mudar o status na tabela acima para 🟨.
2. Marcar cada item `- [x]` no arquivo da onda ao concluir (código + testes + `composer run ci:check` verde).
3. Registrar desvios e decisões novas em [03-decisoes-e-pendencias.md](03-decisoes-e-pendencias.md).
4. Ao fechar a onda, passar para ✅ e preencher "Definição de pronto".

## Priorização (prazo do desafio: 4 dias corridos)

O [requisito](../requisito.md) pede home, busca, detalhe, carrinho, checkout e envio do pedido, em 4 dias, com apresentação de ~40 min. Para não estourar o prazo, executar nesta ordem e cortar do fim para o começo se faltar tempo:

| Prioridade                 | Itens                                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **P0 (núcleo do desafio)** | Onda 1; busca (3); detalhe sem avaliações/zoom avançado (4.1 básico, 4.2, 4.6); carrinho (5); checkout (6, 7); cadastro com aprovação (8.A) |
| **P1 (diferencial)**       | Home completa com carrosséis (2.1, 2.2); zoom/lightbox e compartilhar (4.1, 4.3); lista de desejos (4.4); área do cliente (8.B)             |
| **P2 (se sobrar tempo)**   | Avaliações com selo (4.5); newsletter com double opt-in (2.3); polimento Impeccable fino                                                    |

Ordem de execução sugerida: 1 → 8.A (cadastro/aprovação, pois o preço depende dela) → 2 → 3 → 4 → 5 → 6 → 7 → 8.B.

## Checklist dos entregáveis do desafio

- [ ] Repositório Git com histórico de commits legível (um commit por tarefa/onda).
- [ ] Projeto rodando localmente com dados de demonstração carregados (`sail up` + seed) e usuários de teste documentados no roteiro.
- [ ] Roteiro da apresentação (~40 min): decisões técnicas e de produto, fluxo feliz, cenários de falha (estoque 0, limite estourado, pagamento recusado), cadastro pendente/CNPJ duplicado.

## Fora de escopo (não implementar)

Transferência de propriedade da empresa, desativação/remoção de usuários e cupons (só campo visual desativado) estão **excluídos por ordem expressa**. Detalhes e regra de "perguntar em caso de dúvida" em [03-decisoes-e-pendencias.md](03-decisoes-e-pendencias.md#fora-de-escopo-não-implementar-ordem-expressa).

## Definição de pronto (vale para toda tarefa)

- [ ] Critérios da tarefa atendidos e checklist marcado.
- [ ] Testes Pest cobrindo regras e falhas importantes.
- [ ] `sail composer run ci:check` passando.
- [ ] Revisão visual em todos os breakpoints de [00-diretrizes.md](00-diretrizes.md).
- [ ] Checagem Impeccable (sem padrões de "AI slop") feita.
- [ ] Acessibilidade básica verificada (teclado, foco, contraste, leitor de tela).
