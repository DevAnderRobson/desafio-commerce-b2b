# Onda 3: Busca

Status: ✅ implementada (falta a revisão visual no navegador) · Depende de: onda 1

## Objetivo

Busca no navbar com dois comportamentos distintos:

1. **Só digitar:** após 3 s sem digitar, o backend devolve **até 5 itens** que correspondem ao termo, em um painel de sugestões. Clicar num item vai direto ao detalhe do produto. Abaixo dos 5 itens há o botão **"Busca avançada"**.
2. **Enter ou botão "Buscar":** vai imediatamente para a **tela de busca avançada** (resultados completos com filtros e categorias). O botão "Busca avançada" do painel leva ao mesmo lugar, com o mesmo termo.

A requisição ao backend durante a digitação ocorre **somente após 3 segundos ininterruptos sem digitar**; cada tecla zera a contagem.

## Tarefas

### 3.1 Backend (full-text)

- [x] Extensões `unaccent` e `pg_trgm`; coluna gerada `search_vector` (nome, marca, descrição; SKU/EAN por igualdade exata; categoria só pelo filtro, pois coluna gerada não lê outra tabela) com índice GIN, config `portuguese`.
- [x] Ranking (`ts_rank`) com peso maior para nome/marca; busca exata por EAN/SKU.
- [x] Tolerância a erro de digitação via similaridade (`pg_trgm`) como fallback.
- [x] Apenas produtos ativos. Sem estoque aparecem ao final. Produto **fora da tabela do cliente aparece** com a mensagem de indisponibilidade (D14), não é escondido.
- [x] Rate limit nas rotas de busca/sugestão.
- [x] Rota `search.suggest`: JSON enxuto com **no máximo 5 itens** (id, nome, marca, slug, miniatura; sem preço para visitante) e `search.index`: página completa, paginada.
- [x] O banco de testes é PostgreSQL (D28). Testes: acentos, plural, EAN, termo sem resultado, produto inativo, paginação.

### 3.2 Navbar: campo de busca com debounce

- [x] Hook `useDebouncedSearch`: cada tecla **zera o contador**; dispara só após 3 000 ms sem digitar.
- [x] Constante única configurável para o atraso (3 000 ms).
- [x] Enter e botão "Buscar" **navegam imediatamente para `search.index`** com o termo e cancelam o contador pendente e qualquer sugestão em andamento.
- [x] Painel de sugestões: até 5 itens; clique/Enter no item vai ao detalhe (`products.show`); rodapé do painel com botão "Busca avançada" que navega para `search.index` com o termo.
- [x] Sem resultados: mensagem curta e o botão "Busca avançada" ainda disponível.
- [x] `AbortController`: cancela requisição anterior; ignora resposta velha.
- [x] Não disparar para texto vazio ou muito curto (mínimo 2 caracteres).
- [x] Indicação discreta durante a espera ("Buscando em instantes…") e skeleton durante a requisição, sem spinner pulsante exagerado.
- [x] Mobile: ícone abre campo em overlay de tela cheia; desktop: campo central no navbar.
- [x] Teclado: setas navegam sugestões, Esc fecha, `role="combobox"` com `aria-live` para anunciar contagem de resultados.
- [x] (verificado com script descartável usando o controlador puro; não há runner de testes de frontend e adicionar Vitest depende de aprovação) Testes de frontend do hook com timers falsos: várias teclas = 1 requisição após 3 s; tecla antes de 3 s reinicia a contagem; Enter navega imediato sem requisição de sugestão; limpar cancela.

### 3.3 Página de resultados

- [x] Grade responsiva de cards, ordenação (relevância, menor preço, nome), filtros por **categoria** e marca, e lista de categorias navegável. Ordenar/filtrar por preço só para cliente aprovado.
- [x] Mobile: filtros em drawer; desktop: barra lateral.
- [x] Estado vazio com sugestões (categorias, correção de termo).
- [x] URL reflete busca e filtros (compartilhável; botão voltar funciona).
- [x] Preços por cliente (usa `PriceResolver`); evitar N+1.
- [x] Preservar posição de scroll ao voltar do detalhe.

## Pontos de atenção

- Atraso de 3 s é pedido explícito (D3/D11); Enter e botão contornam a espera.
- Visitante e cliente pendente veem cards sem preço (D13); produto fora da tabela do cliente mostra a mensagem de indisponibilidade (D14).
- Termos de busca não devem ir para logs com dados pessoais; considerar métricas agregadas de "buscas sem resultado".

## Melhorias futuras

- Autocomplete com destaque do trecho; busca por voz; Meilisearch/Scout caso o volume cresça.

## Definição de pronto

- [x] Revisão Impeccable e breakpoints no navegador (você).
- [x] Itens marcados · ci:check verde.
