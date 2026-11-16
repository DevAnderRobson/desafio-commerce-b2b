# Onda 1: Fundação e catálogo

Status: 🟨 quase concluída (falta só a revisão visual dos layouts e o teste de vazamento de preço, que depende das telas das ondas 2–4) · Depende de: nada · Diretrizes: [00](../00-diretrizes.md) · Dados: [02](../02-modelo-de-dados.md)

## Objetivo

Base técnica e visual da loja: layouts, tokens de design, banco com os dados dos JSONs e serviço de preço por cliente.

## Tarefas

### 1.1 Design tokens e layouts

- [x] Definir escala de espaçamento, raios, tipografia fluida e cores (reaproveitar tokens existentes; destaque escasso).
- [x] Adicionar breakpoint ultrawide (`3xl`) e container máximo.
- [x] `StoreLayout`, `CheckoutLayout`, `AccountLayout` (ver [01](../01-rotas-e-telas.md)).
- [x] Componentes base: botão, campo com label, card de produto, selo de preço, skeleton, estado vazio, toast.
- [x] Separar rotas: `routes/web.php` agora só inclui `store.php`, `account.php` e `settings.php`; `dashboard` virou `account.dashboard` (`/conta`, página `account/dashboard`), com redirecionamento 301 de `/dashboard`, `config/fortify.php` (`home`) e testes de auth ajustados.

Revisão da entrega do Antigravity (worktree `onda1-frontend-base`, ainda **não integrado** ao `main`):

- `npm run check` e `types:check` passam; sem gradientes decorativos.
- Atenção: alterou componentes compartilhados (`ui/button`, `ui/input`, `ui/skeleton`, `ui/sonner`), então botões/inputs das telas de auth e settings ficam com altura mínima de 44 px; conferir visualmente.
- `app.tsx` mapeia layouts por prefixo de página (`store/`, `checkout/`, `account/`): as páginas das próximas ondas devem seguir esses prefixos.
- Há re-exports redundantes (`components/button.tsx`, `components/skeleton.tsx`, `toast.tsx`) e `store-layout.tsx` com ~580 linhas; candidatos a simplificação na revisão visual.

Regras / atenção:

- Um único card de produto reutilizado em home, busca, carrosséis e desejos.
- Cada componente nasce responsivo e acessível (foco visível, alvo ≥ 44 px).

### 1.2 Banco e importação

- [x] Migrations/models/factories/seeders das entidades do catálogo (customers, products, categories, stocks, price_tables, price_table_items, promotions, payment_terms).
- [x] Relacionar `users` a `customers` (vários usuários por empresa; papel dono/membro em `users.company_role`, **sem** `owner_user_id`); `customers.approval_status` (pending/approved/rejected) e `duplicate_of_customer_id` (índice único parcial do CNPJ só para o cadastro original).
- [x] Usuários de teste (`DemoUsersSeeder`, senha `password`): `dono1..3@example.com`, `membro1@example.com`, `pendente@example.com`, `duplicado@example.com`.
- [x] Tabelas `product_images` e `product_attributes` (models `ProductImage`/`ProductAttribute`, relações `images()` e `specifications()` no `Product`).
- [x] `DemoCatalogSeeder` (Antigravity, revisado): 3 imagens SVG neutras por produto ativo (`public/demo/products`) e 5 atributos pt-BR por produto ativo.
- [x] Avaliações e pedidos entregues fictícios: dependem de models das ondas 4 e 7. _(feito na onda 4: `DemoReviewsSeeder`; pedidos completos na onda 7)_
- [ ] Comando `customers:approve {id}` (movido para a onda 8.A, junto com o fluxo de cadastro e e-mails) para aprovar/recusar enquanto não há painel de gestão.
- [x] Copiar os JSONs de `docs/data` para `database/seeders/data/` (D26) e criar `CatalogImporter` idempotente, usado pelo `DatabaseSeeder` e por `php artisan catalog:import {--path=}`, com relatório de inconsistências. Nada em runtime lê `docs/`. **Apenas copiar; jamais alterar, mover ou reformatar os arquivos de `docs/data`** (D26).
- [x] **Banco de testes/CI em PostgreSQL (D28):** adicionar serviço Postgres ao `.github/workflows/tests.yml` e alinhar `.env.example`/`phpunit.xml`; confirmar `ci:check` verde localmente e no CI.
- [x] Slugs únicos de produto/categoria.
- [x] Promoções demo extras (8, `is_demo`, vigentes) e estoques variados preservados dos JSONs (48 zerados, 47 baixos, 405 altos); cliente 3 já vem bloqueado dos JSONs.
- [x] Testes (com factories, D27): importação a partir de fixtures pequenas não duplica ao repetir; JSON inválido é reportado; produto inativo importado e oculto.

Regras / atenção:

- Valores em centavos. Produto inativo (8) importado, mas oculto; 48 produtos com estoque 0 ficam indisponíveis.
- Slug do produto inclui o id/sku para garantir unicidade.
- `ATACADISTA` não cobre todos os produtos: esses aparecem como indisponíveis para o modelo do cliente (D14).

### 1.3 Serviço de preço

- [x] `PriceResolver` (`app/Pricing`): dado cliente + produto + quantidade → preço unitário, origem, economia.
- [x] Atacado apenas ao atingir a quantidade mínima; promoção apenas dentro da vigência; **promoção é por produto**, só incide sobre o preço unitário do item citado (percentual sobre o preço de atacado quando aplicável) e nunca sobre o total.
- [x] Seguir a ordem de cálculo e o arredondamento de [02](../02-modelo-de-dados.md#cálculo-de-totais-ordem-única).
- [x] Retornar "sem preço" para visitante/cliente não aprovado e "indisponível para o modelo de compra" para produto fora da tabela do cliente.
- [x] Testes: promoção vencida/futura, atacado no limite (qtd_min − 1, qtd_min), atacado + promoção do mesmo item, vários itens em promoção no carrinho (cada um com o seu percentual), item sem promoção não é afetado, arredondamento, produto fora da tabela, visitante, cliente pendente.

### 1.4 Autorização de compra

- [x] Gates `view-prices` e `checkout` (`AppServiceProvider`): cliente não aprovado não vê preço nem compra; cliente bloqueado não finaliza compra; usuário sem `customer` não vê preço.
- [x] (coberto na home em `HomeTest`; repetir nas ondas 3–4) Garantir que preço/tabela do cliente **não vazam** em props Inertia nem JSON para visitante ou cliente não aprovado (teste explícito).
- [x] Testes de política (`ShopAbilitiesTest`).

## Melhorias futuras

- Cache de preços por tabela; ETag nas listagens.
- Importação via fila para catálogos grandes.

## Definição de pronto

- [x] Itens marcados · `sail composer run ci:check` verde · layouts revisados nos breakpoints.
