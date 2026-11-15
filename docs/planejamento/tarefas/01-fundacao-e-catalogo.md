# Onda 1: Fundação e catálogo

Status: ⬜ não iniciada · Depende de: nada · Diretrizes: [00](../00-diretrizes.md) · Dados: [02](../02-modelo-de-dados.md)

## Objetivo

Base técnica e visual da loja: layouts, tokens de design, banco com os dados dos JSONs e serviço de preço por cliente.

## Tarefas

### 1.1 Design tokens e layouts

- [ ] Definir escala de espaçamento, raios, tipografia fluida e cores (reaproveitar tokens existentes; destaque escasso).
- [ ] Adicionar breakpoint ultrawide (`3xl`) e container máximo.
- [ ] `StoreLayout`, `CheckoutLayout`, `AccountLayout` (ver [01](../01-rotas-e-telas.md)).
- [ ] Componentes base: botão, campo com label, card de produto, selo de preço, skeleton, estado vazio, toast.
- [ ] Separar rotas: arquivos/grupos de rota para loja e conta; renomear `dashboard` para `account.dashboard` com redirecionamento.

Regras / atenção:

- Um único card de produto reutilizado em home, busca, carrosséis e desejos.
- Cada componente nasce responsivo e acessível (foco visível, alvo ≥ 44 px).

### 1.2 Banco e importação

- [ ] Migrations/models/factories/seeders das entidades do catálogo (customers, products, categories, stocks, price_tables, price_table_items, promotions, payment_terms).
- [ ] Relacionar `users` a `customers` (vários usuários por empresa; `owner_user_id` e papel dono/membro); `customers.approval_status` (pendente/aprovado/recusado).
- [ ] Seeders de demonstração: imagens de exemplo, atributos genéricos, avaliações e pedidos entregues fictícios, usuários de teste (dono e membro aprovados, pendente, e pendente com CNPJ duplicado).
- [ ] Comando `customers:approve {id}` para aprovar/recusar enquanto não há painel de gestão.
- [ ] Copiar os JSONs de `docs/data` para `database/seeders/data/` (D26) e criar `CatalogImporter` idempotente, usado pelo `DatabaseSeeder` e por `php artisan catalog:import {--path=}`, com relatório de inconsistências. Nada em runtime lê `docs/`. **Apenas copiar; jamais alterar, mover ou reformatar os arquivos de `docs/data`** (D26).
- [ ] **Banco de testes/CI em PostgreSQL (D28):** adicionar serviço Postgres ao `.github/workflows/tests.yml` e alinhar `.env.example`/`phpunit.xml`; confirmar `ci:check` verde localmente e no CI.
- [ ] Slugs únicos de produto/categoria.
- [ ] Seeder demo adicional: promoções extras (marcadas como demo) para o carrossel; cliente 3 aprovado porém `bloqueado`; estoques variados.
- [ ] Testes (com factories, D27): importação a partir de fixtures pequenas não duplica ao repetir; JSON inválido é reportado; produto inativo importado e oculto.

Regras / atenção:

- Valores em centavos. Produto inativo (8) importado, mas oculto; 48 produtos com estoque 0 ficam indisponíveis.
- Slug do produto inclui o id/sku para garantir unicidade.
- `ATACADISTA` não cobre todos os produtos: esses aparecem como indisponíveis para o modelo do cliente (D14).

### 1.3 Serviço de preço

- [ ] `PriceResolver`: dado cliente + produto + quantidade → preço unitário, origem, economia.
- [ ] Atacado apenas ao atingir a quantidade mínima; promoção apenas dentro da vigência; **promoção é por produto**, só incide sobre o preço unitário do item citado (percentual sobre o preço de atacado quando aplicável) e nunca sobre o total.
- [ ] Seguir a ordem de cálculo e o arredondamento de [02](../02-modelo-de-dados.md#cálculo-de-totais-ordem-única).
- [ ] Retornar "sem preço" para visitante/cliente não aprovado e "indisponível para o modelo de compra" para produto fora da tabela do cliente.
- [ ] Testes: promoção vencida/futura, atacado no limite (qtd_min − 1, qtd_min), atacado + promoção do mesmo item, vários itens em promoção no carrinho (cada um com o seu percentual), item sem promoção não é afetado, arredondamento, produto fora da tabela, visitante, cliente pendente.

### 1.4 Autorização de compra

- [ ] Política: cliente não aprovado não vê preço nem compra; cliente bloqueado não finaliza compra; usuário sem `customer` não vê preço.
- [ ] Garantir que preço/tabela do cliente **não vazam** em props Inertia nem JSON para visitante ou cliente não aprovado (teste explícito).
- [ ] Testes de política.

## Melhorias futuras

- Cache de preços por tabela; ETag nas listagens.
- Importação via fila para catálogos grandes.

## Definição de pronto

- [ ] Itens marcados · `sail composer run ci:check` verde · layouts revisados nos breakpoints.
