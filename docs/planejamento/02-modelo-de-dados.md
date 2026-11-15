# Modelo de dados e regras derivadas dos JSONs

Fonte: `docs/data/*.json` (500 produtos, 3 clientes, 2 tabelas de preço, 3 promoções, 3 condições de pagamento, estoque por produto). Banco: PostgreSQL (Sail).

## O que os arquivos dizem

| Arquivo                    | Campos relevantes                                                                                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `produtos.json`            | id, sku, ean, nome, descricao, marca, categoria (5), ativo                                                                                                           |
| `estoque.json`             | produto_id, quantidade (há produtos com 0)                                                                                                                           |
| `tabelas_preco.json`       | codigo (`PADRAO`, `ATACADISTA`), itens: produto_id, preco, `preco_atacado` + `qtd_minima_atacado` (opcionais). `ATACADISTA` não cobre todos os produtos (472 de 500) |
| `clientes.json`            | cnpj, razao_social, nome_fantasia, cidade, uf, tabela_preco, limite_credito, limite_utilizado, bloqueado                                                             |
| `promocoes.json`           | produto_id, percentual_desconto, inicio, fim (há vencida e futura)                                                                                                   |
| `condicoes_pagamento.json` | codigo, descricao, valor_minimo, acrescimo_percentual, a_prazo                                                                                                       |

## Fatos dos dados (verificados em 2026-11-14)

- 500 produtos, **8 inativos**; SKU/EAN/ID únicos; estoque para todos, **48 com quantidade 0**.
- Tabelas de preço sem duplicidade e consistentes (atacado sempre menor que o preço; `preco_atacado` e `qtd_minima_atacado` sempre juntos). `PADRAO` cobre 500; **`ATACADISTA` cobre 472**.
- Alguns produtos **inativos têm preço** nas tabelas: importar normalmente, mas ocultar.
- Clientes: 1 e 2 aprovados e liberados; **cliente 3 está `bloqueado`** (cobre o cenário de bloqueio); cliente 2 tem só R$ 1.500 de limite disponível (cobre o cenário de limite estourado) e usa `ATACADISTA`.
- Promoções: 1 vigente (produto 1152), 1 **vencida** (1007), 1 **futura** (1182). Com só uma vigente o carrossel "Em promoção" ficaria vazio: o seeder demo cria **promoções extras marcadas como demo** (os JSONs não são alterados).
- Nenhum dado de endereço, imagem, peso, venda ou usuário nos JSONs: tudo isso é gerado como exemplo (D12).

## Regras de negócio

0. **Visibilidade de preço:** só para usuário logado cujo cliente (empresa) esteja **aprovado**. Visitante e cliente pendente/recusado veem produtos sem preço e sem botão de compra.
1. **Preço do cliente:** vem da tabela do cliente (`PADRAO` ou `ATACADISTA`). Produto fora da tabela do cliente: exibir a mensagem "Este produto não está disponível para o seu modelo de compra (Padrão/Atacadista)"; não pode ser adicionado ao carrinho.
2. **Atacado:** se a quantidade no carrinho ≥ `qtd_minima_atacado`, usar `preco_atacado`. Mostrar a faixa ("a partir de N un.: R$ X") no produto e o ganho no carrinho.
3. **Promoção (por produto):** vale só com `inicio <= hoje <= fim` e **apenas para o `produto_id` da promoção**. O percentual incide sobre o preço unitário daquele item (preço de atacado, se a quantidade mínima foi atingida; senão o preço normal). Nunca sobre o total do carrinho: com vários itens em promoção, cada linha recebe o seu percentual. Arredondar por unidade em centavos (regra única, testada).
4. **Estoque:** quantidade 0 = indisponível (não adiciona ao carrinho); limitar quantidade ao estoque; reserva/baixa no pedido.
5. **Produto inativo** não aparece na loja nem na busca.
6. **Cliente bloqueado:** pode navegar, não pode finalizar; mensagem clara na tela do carrinho/checkout.
7. **Limite de crédito:** disponível = `limite_credito - limite_utilizado`. Pagamento **a prazo** só se o total (com acréscimo) couber no disponível. Pagamento à vista (PIX) não consome limite.
8. **Condição de pagamento:** só disponível se total ≥ `valor_minimo`; aplica `acrescimo_percentual` sobre o total; mostrar o acréscimo no resumo.
9. **Cupom:** fora do escopo (D20). Sem tabela, regra ou cálculo; apenas campo visual desativado no frontend.
10. **Frete:** sem dados de origem; calculado por serviço simulado atrás de interface (ver onda 6).

## Entidades propostas

> Esquema indicativo; refinar na execução da onda 1.

- `customers` (empresa; do `clientes.json`) — cnpj, razão social, nome fantasia, `price_table_id`, limite de crédito/utilizado (centavos), bloqueado, **`approval_status` (`pendente`, `aprovado`, `recusado`)**, `approved_at`, `approved_by`. Os 3 clientes dos JSONs entram como aprovados; novos cadastros entram como pendentes.
- `users` (existente) — pertence a um `customer` (`customer_id`). **Vários usuários por empresa**; `customers.owner_user_id` marca o dono (quem fez o cadastro da empresa). Só o dono cria/vincula/desativa usuários da empresa, sem aprovação do lojista. Papel do usuário na empresa: `dono` ou `membro`.
- `customers.duplicate_cnpj_of` / flag `cnpj_duplicado`: cadastro com CNPJ já existente é aceito como pendente e marcado para o lojista (ver D19); o solicitante nunca recebe indício de que o CNPJ existe.
- `products` — sku, ean, nome, slug, descrição, marca, `category_id`, ativo, `search_vector` (tsvector).
- `categories` — nome, slug.
- `product_images` — product_id, caminho, alt, posição (dados originais não têm imagem).
- `product_attributes` — product_id, nome, valor (características/ficha).
- `stocks` — product_id, quantidade (e `reserved` se houver reserva).
- `price_tables` / `price_table_items` — código; product_id, preço, preço atacado, qtd mínima (centavos).
- `promotions` — product_id, percentual, início, fim.
- `payment_terms` — código, descrição, valor mínimo, acréscimo %, a_prazo.
- `addresses` — customer_id (**endereços são da empresa**, compartilhados entre seus usuários), apelido, CEP, logradouro, número, complemento, bairro, cidade, UF, `last_used_at`, padrão.
- `carts` / `cart_items` — **user_id** (carrinho é do usuário), product_id, quantidade. A empresa é derivada do usuário.
- `orders` / `order_items` — número, (**pedidos são da empresa**; guardar também o `user_id` de quem comprou), `delivered_at`, customer_id, user_id, endereço (snapshot), totais, frete, desconto, acréscimo, condição de pagamento, status, chave de idempotência; itens com **preço congelado**.
- `payments` — order_id, método, status, tentativas, referência externa, payload.
- `reviews` — product_id, user_id, nota (1–5), título, texto; `verified_purchase` calculado pelo sistema: verdadeiro apenas se existir pedido **entregue** (`delivered_at` preenchido) com o produto em que o avaliador seja o **usuário que comprou** (`orders.user_id`) **ou o dono da empresa** (D33).
- `wishlist_items` — **user_id** (lista de desejos é do usuário), product_id; único por usuário/produto.
- `newsletter_subscriptions` — e-mail único, consentimento, data, token de descadastro.
- `product_sales_stats` (ou view materializada) — para "mais vendidos".

## Glossário e estados

Nomes de código em inglês (D29); os rótulos entre parênteses são os termos usados nos docs e na interface.

| Conceito                                           | Valores (código)                                                                                                                                                                                                                                            |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Aprovação da empresa (`customers.approval_status`) | `pending` (pendente), `approved` (aprovado), `rejected` (recusado)                                                                                                                                                                                          |
| Papel do usuário na empresa                        | `owner` (dono), `member` (membro)                                                                                                                                                                                                                           |
| Pedido (`orders.status`)                           | `pending_payment` (aguardando pagamento) → `paid` (pago) → `picking` (separando) → `shipped` (enviado) → `delivered` (entregue). Terminais de falha: `payment_refused` (recusado), `payment_failed` (falhou), `expired` (expirado), `cancelled` (cancelado) |
| Pagamento (`payments.status`)                      | `pending`, `approved`, `refused`, `failed`                                                                                                                                                                                                                  |
| Newsletter                                         | `pending`, `confirmed`, `unsubscribed`                                                                                                                                                                                                                      |

Transições válidas ficam numa única classe de estados (enum + método `canTransitionTo`), com teste.

## Cálculo de totais (ordem única)

1. Preço unitário base: `price` ou, se `qty >= qtd_minima_atacado`, `preco_atacado`.
2. Promoção vigente do produto: desconto % sobre esse preço unitário, **arredondado em centavos por unidade** (half-up).
3. Total da linha = preço unitário final × quantidade. Subtotal = soma das linhas.
4. Valor mínimo da condição de pagamento é comparado ao **subtotal** (sem frete).
5. Frete simulado a partir do subtotal e do endereço.
6. Acréscimo % da condição incide sobre **subtotal + frete** (half-up em centavos).
7. Total do pedido = subtotal + frete + acréscimo. Pagamento a prazo exige limite disponível ≥ total.

## Reserva de estoque e crédito

- Carrinho **não** reserva estoque. O pedido reserva ao ser criado (`stocks.reserved`) e baixa ao ser pago; falha/expiração devolve.
- Pedido a prazo reserva também o limite de crédito da **empresa** (lock na linha do `customer`), e confirma/libera junto com o pagamento (D30). Nesta demo `limite_utilizado` só aumenta (pagamento de boleto não é modelado).
- Comando agendado expira pedidos `pending_payment` antigos (reserva liberada, status `expired`).

## Notificações (e-mails, sempre em fila)

Confirmação de newsletter · cadastro aprovado · cadastro recusado (dois templates à escolha do lojista no caso de CNPJ duplicado: padrão ou orientando procurar o administrador, D35) · convite de usuário vinculado (link para definir senha) · pedido confirmado · pagamento recusado/falho.

## Dados de exemplo (demo)

O sistema é de demonstração; o que os JSONs não trazem é gerado por seeders com dados genéricos, marcados como demo:

- imagens de exemplo por produto/categoria (placeholder consistente) e atributos/características genéricos;
- avaliações de exemplo, pedidos entregues fictícios (base de "mais vendidos");
- usuários de teste: um dono por cliente dos JSONs (aprovado), um membro vinculado, um cadastro pendente e um pendente com CNPJ duplicado (para demonstrar a flag e a recusa).

## Importação (D26)

- Classe `CatalogImporter` (idempotente, upsert por id/sku/código) usada pelo `DatabaseSeeder` e pelo comando `php artisan catalog:import {--path=}`. O caminho padrão é `database/seeders/data/` (cópia dos JSONs); `docs/data` não é lido em execução.
- Validar os JSONs e reportar inconsistências: produto sem preço, estoque sem produto, promoção para produto inexistente, tabela de preço inexistente para cliente.
- Os JSONs originais em `docs/data` **nunca são alterados** (D26); só se copiam; ajustes de demonstração vêm de seeders demo separados.
- Depois da carga o banco é a única fonte: nenhuma tela, serviço ou teste consulta os JSONs.
