# Portal B2B

Loja virtual **B2B** de demonstração, feita para um desafio técnico: os clientes são **empresas** que fazem login para comprar, e **cada empresa vê o seu próprio preço**. O projeto cobre a jornada completa: vitrine, busca, detalhe do produto, carrinho, checkout, pagamento assíncrono, acompanhamento do pedido em tempo real e área do cliente.

- **Back-end:** Laravel 13 (PHP 8.5), PostgreSQL, filas com RabbitMQ, WebSocket com Laravel Reverb.
- **Front-end:** React + Inertia v3 + Tailwind, com Wayfinder para rotas tipadas.
- **Qualidade:** Pest (mais de 380 testes), Larastan (PHPStan), Pint, e verificação de tipos/lint do front.

> Todo o sistema é uma **demonstração**: pagamento e frete são **simulados**, e dados que os arquivos do desafio não trazem (imagens, características, avaliações, pedidos) são gerados por seeders com conteúdo de exemplo.

---

## Sumário

1. [O intuito do projeto](#1-o-intuito-do-projeto)
2. [O que foi construído](#2-o-que-foi-construído)
3. [Como rodar com Laravel Sail](#3-como-rodar-com-laravel-sail)
4. [Contas de demonstração e roteiro de teste](#4-contas-de-demonstração-e-roteiro-de-teste)
5. [Simulando pagamento, entrega e rastreamento](#5-simulando-pagamento-entrega-e-rastreamento)
6. [Comandos úteis](#6-comandos-úteis)
7. [Rodando sem Sail](#7-rodando-sem-sail)
8. [Arquitetura e decisões](#8-arquitetura-e-decisões)
9. [O que ficou de fora de propósito](#9-o-que-ficou-de-fora-de-propósito)
10. [Como o projeto foi construído](#10-como-o-projeto-foi-construído)

---

## 1. O intuito do projeto

O desafio pedia uma loja B2B com home, busca, detalhe do produto, carrinho, checkout e envio do pedido, usando os dados da pasta `docs/data` (produtos, estoque, tabelas de preço, clientes, promoções e condições de pagamento). O foco não é só "funcionar": é mostrar **decisões técnicas e de produto justificadas**, com regras de negócio realistas de um B2B:

- **Preço por cliente.** Cada empresa tem uma tabela de preço (**Padrão** ou **Atacadista**). Produto fora da tabela da empresa aparece como indisponível para o modelo de compra dela.
- **Preço só depois do login e da aprovação.** Visitante e empresa pendente veem o produto, sem preço e sem compra.
- **Promoção por produto**, aplicada ao preço unitário do próprio item (nunca sobre o total do carrinho) e combinável com o preço de atacado.
- **Crédito e prazo.** Condições a prazo respeitam valor mínimo e o limite de crédito da empresa; estourar o limite **bloqueia** a condição.
- **Pedido da empresa, carrinho do usuário.** Vários usuários por empresa compartilham endereços e pedidos, mas cada um tem o seu carrinho e a sua lista de desejos.

---

## 2. O que foi construído

O trabalho foi dividido em ondas. Cada onda tem planejamento e checklist em [`docs/planejamento`](docs/planejamento/README.md).

| Onda                        | O que entrega                                                                                                                                                                                                                                                                                                          |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Fundação e catálogo**  | Layouts, tokens de design, banco de dados, **importação idempotente dos JSONs** (`catalog:import`), cálculo de preço por cliente (`PriceResolver`), regras de acesso (aprovação, bloqueio).                                                                                                                            |
| **2. Home**                 | Vitrine com carrosséis (promoções, mais vendidos, destaques), carregamento adiado com skeleton e **newsletter com confirmação por e-mail** (double opt-in).                                                                                                                                                            |
| **3. Busca**                | **Busca full-text em PostgreSQL** (sem acento, tolerante a erro de digitação, por SKU/EAN), sugestões com **debounce de 3 s**, filtros por categoria e marca, ordenação e paginação.                                                                                                                                   |
| **4. Detalhe do produto**   | Galeria com **zoom** (pinça, duplo toque, roda, teclado), ficha técnica, preço de atacado e promoção, compartilhar, lista de desejos e **avaliações com selo "Comprou"** calculado pelo sistema (só com pedido entregue).                                                                                              |
| **5. Carrinho**             | Carrinho por usuário com validação de estoque e preço no servidor, **contador animado** no navbar, mini-carrinho ao passar o mouse, avisos de mudança de preço/estoque.                                                                                                                                                |
| **6. Checkout: entrega**    | Endereços da empresa inline (último usado pré-selecionado), **consulta de CEP**, **frete simulado** por região com frete grátis configurável, campo de cupom apenas visual.                                                                                                                                            |
| **7. Pagamento assíncrono** | Escolha da condição de pagamento (indisponíveis explicadas), pedido **idempotente** com **reserva de estoque e de crédito** com lock, processamento em fila com tentativas e backoff, expiração, nova tentativa após recusa, e-mails e **acompanhamento em tempo real** pelo Reverb.                                   |
| **8. Área do cliente**      | Cadastro de empresa com **aprovação manual** (CNPJ duplicado tratado sem revelar a existência), usuários da empresa, resumo com crédito, pedidos com **linha do tempo e rastreamento cidade a cidade**, repetir pedido, endereços, lista de desejos, configurações, logout e **botão flutuante de tema claro/escuro**. |

Detalhes que valem a demonstração:

- **Dinheiro em centavos** (inteiros) e arredondamento half-up definido em um só lugar (`docs/planejamento/02-modelo-de-dados.md`).
- **Nunca confiar no navegador:** preços, frete, acréscimo, estoque e crédito são recalculados no servidor a cada operação.
- **Sem vazamento de preço:** os preços só viram props da página em `ProductCardPresenter` e `ProductDetailPresenter`, depois de checar o direito do usuário.
- **Mensageria:** os eventos `order.created` e `order.paid` são publicados no RabbitMQ (`app/Messaging`), com consumo idempotente.

---

## 3. Como rodar com Laravel Sail

O ambiente completo (PHP 8.5, PostgreSQL, Redis, RabbitMQ, Mailpit, Reverb e Vite) sobe em containers. Você só precisa de **Docker**.

### Pré-requisitos

- Docker e Docker Compose
- Git
- (Opcional) PHP 8.5 e Composer no seu computador. Sem eles, use o passo 2 alternativo.

### Passo a passo

**1. Clone o projeto e crie o `.env`**

```bash
git clone https://github.com/DevAnderRobson/desafio-commerce-b2b.git portal-b2b
cd portal-b2b
cp .env.example .env
```

O `.env.example` já vem configurado para o Sail (PostgreSQL, RabbitMQ, Mailpit e Reverb).

**2. Instale as dependências PHP**

Com Composer local:

```bash
composer install
```

Sem PHP/Composer local, instale usando um container temporário do Sail:

```bash
docker run --rm -u "$(id -u):$(id -g)" -v "$(pwd):/var/www/html" -w /var/www/html \
  laravelsail/php85-composer:latest composer install --ignore-platform-reqs   # ajuste a versão (php85) se a imagem mudar
```

**3. Suba os containers**

```bash
./vendor/bin/sail up -d
```

**4. Gere a chave, crie as tabelas e carregue os dados**

```bash
./vendor/bin/sail artisan key:generate
./vendor/bin/sail artisan migrate --seed
```

O `--seed` importa os JSONs do desafio (produtos, estoque, tabelas de preço, clientes, promoções, condições de pagamento) e gera os dados de demonstração: imagens, características, promoções, usuários de teste, avaliações e pedidos entregues. É idempotente: pode rodar de novo sem duplicar.

**5. Crie as filas e exchanges do RabbitMQ**

```bash
./vendor/bin/sail artisan messaging:setup
```

Declara no broker os _exchanges_ (`orders` e `deliveries`), as filas de mensagens com falha (DLQ) e os _bindings_. É **idempotente**: pode rodar quantas vezes quiser, e `--dry-run` só mostra o plano. Rode na primeira subida e sempre que recriar o volume do RabbitMQ. Sem isso, os pagamentos e e-mails funcionam (a fila principal se cria sozinha no primeiro uso), mas os eventos `order.created` e `order.paid` não chegam a lugar nenhum e as mensagens com falha não têm para onde ir.

**6. Instale as dependências JavaScript**

```bash
./vendor/bin/sail npm install
```

**7. Suba tudo para desenvolver**

```bash
composer run dev-sail
```

Esse script sobe o Sail e abre, em um só terminal, os 5 processos de que o projeto precisa:

| Processo   | Para que serve                                                                  |
| ---------- | ------------------------------------------------------------------------------- |
| `queue`    | Worker da fila (RabbitMQ): processa pagamentos, e-mails e publicação de eventos |
| `logs`     | `pail`, acompanhamento dos logs em tempo real                                   |
| `reverb`   | Servidor WebSocket do acompanhamento do pedido                                  |
| `schedule` | Agendador: expira pedidos não pagos e registra os eventos de rastreamento       |
| `vite`     | Servidor de desenvolvimento do front-end                                        |

> Sem Composer local? Rode manualmente `./vendor/bin/sail up -d` e depois
> `./vendor/bin/sail npx concurrently "php artisan queue:listen --tries=1" "php artisan reverb:start" "php artisan schedule:work" "npm run dev"`.

### Endereços

| Serviço                                     | URL                    |
| ------------------------------------------- | ---------------------- |
| **Loja**                                    | http://localhost       |
| E-mails de teste (Mailpit)                  | http://localhost:8025  |
| RabbitMQ (usuário `sail`, senha `password`) | http://localhost:15672 |
| WebSocket (Reverb)                          | `localhost:8080`       |
| Vite (HMR)                                  | http://localhost:5173  |

### Build de produção do front

```bash
./vendor/bin/sail npm run build
```

Para só olhar a loja sem hot reload, rode o build, suba o Sail e mantenha `queue:work`, `reverb:start` e `schedule:work` em execução (os testes do back também exigem o build).

### Se algo não funcionar

- **A página mostra erro de Vite/manifest:** rode `./vendor/bin/sail npm run build` ou deixe o `composer run dev-sail` rodando.
- **Os eventos de pedido não são publicados (erro "unroutable" ou "rejected by broker" no log):** falta rodar `./vendor/bin/sail artisan messaging:setup`.
- **O pagamento fica "processando" para sempre:** o worker de fila não está rodando (`queue`).
- **O rastreamento não anda:** falta o agendador (`schedule`).
- **O acompanhamento não atualiza ao vivo:** confira o `reverb` e a porta `8080`. Se ela não responder, recrie os containers com `./vendor/bin/sail up -d` (o `compose.yaml` publica a porta). Sem o Reverb, a tela continua atualizando por polling.
- **Recomeçar do zero:** `./vendor/bin/sail artisan migrate:fresh --seed`.

---

## 4. Contas de demonstração e roteiro de teste

Todas as senhas são `password`.

| E-mail                  | Empresa            | Modelo         | Situação                                                                                                                     |
| ----------------------- | ------------------ | -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `dono1@example.com`     | Bom Preço          | **Padrão**     | Aprovada. Crédito de R$ 15.000, já usados cerca de R$ 11.000.                                                                |
| `dono2@example.com`     | Atacadão Central   | **Atacadista** | Aprovada. Crédito de R$ 80.000 com R$ 78.500 usados: só restam **R$ 1.500**, ideal para ver o bloqueio de pagamento a prazo. |
| `dono3@example.com`     | Empório São Jorge  | Padrão         | Aprovada, mas **bloqueada**: vê preços, não finaliza compra.                                                                 |
| `membro1@example.com`   | Bom Preço          | Padrão         | **Usuário vinculado** (mesma empresa do `dono1`: compartilha pedidos e endereços, mas não o carrinho).                       |
| `pendente@example.com`  | Empresa Pendente   | Padrão         | **Cadastro pendente**: navega, mas sem preço e sem compra.                                                                   |
| `duplicado@example.com` | Cadastro duplicado | —              | Mostra o fluxo de **CNPJ duplicado**, aceito como pendente e sinalizado.                                                     |
| (sem login)             | —                  | —              | **Visitante**: vê o catálogo sem preços.                                                                                     |

### Roteiro sugerido

1. **Visitante:** abra a home, pesquise "arroz" ou "guarana" (a busca ignora acentos), veja que não há preço e que há convite para entrar.
2. **`dono1`:** entre, veja o preço, a promoção e o preço de atacado ("a partir de N un."). Abra um produto, use o zoom na galeria, favorite, avalie.
3. **Carrinho:** adicione pelo card (1 un. por clique) e pela página do produto (quantidade). Veja o contador animado e o mini-carrinho ao passar o mouse.
4. **Checkout:** cadastre um endereço (teste um CEP real), escolha o frete, depois o pagamento. As condições a prazo ficam desabilitadas com o motivo (valor mínimo ou limite).
5. **Pedido:** confirme. Acompanhe o processamento em tempo real e a confirmação. Abra o e-mail no Mailpit.
6. **Área do cliente:** em `/conta`, veja crédito, pedidos, repita um pedido, gerencie endereços e a lista de desejos.
7. **`dono2`:** compare o preço do mesmo produto (tabela Atacadista) e veja o limite de crédito bloqueando o prazo.
8. **`dono3`:** veja o aviso de empresa bloqueada e o checkout travado.
9. **Cadastro:** crie uma nova empresa em `/register`, veja a faixa de "cadastro em análise" e aprove-a pelo comando abaixo.

Aprovar ou recusar cadastros (não há painel da loja nesta versão):

```bash
./vendor/bin/sail artisan customers:approve {id}
./vendor/bin/sail artisan customers:approve {id} --reject --template=default
```

---

## 5. Simulando pagamento, entrega e rastreamento

O gateway e a transportadora são simulados e configuráveis pelo `.env`:

| Variável                      | Valores                                              | Efeito                                                                                                                                             |
| ----------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SHOP_PAYMENT_OUTCOME`        | `approved` (padrão), `refused`, `transient`, `flaky` | Resultado do pagamento: aprovado, recusado, erro temporário até esgotar as tentativas (o pedido falha) ou instável (falha 2 vezes e aprova na 3ª). |
| `SHOP_PAYMENT_DELAY`          | segundos (padrão `3`)                                | Atraso do gateway, para dar tempo de ver a tela de processamento.                                                                                  |
| `SHOP_PAYMENT_EXPIRE_MINUTES` | minutos (padrão `30`)                                | Pedido não pago expira e devolve estoque e crédito.                                                                                                |
| `SHOP_TRACKING_INTERVAL`      | minutos (padrão `1`)                                 | Intervalo entre os eventos de rastreamento.                                                                                                        |

Depois de alterar o `.env`, reinicie o worker (`composer run dev-sail`).

**Ciclo do pedido** (de demonstração, até existir uma gestão da loja):

```bash
./vendor/bin/sail artisan orders:advance PED-XXXXXX-XXXXX picking    # em separação
./vendor/bin/sail artisan orders:advance PED-XXXXXX-XXXXX shipped    # enviado: gera código de rastreio
```

A partir de `shipped`, o agendador (`orders:track`) registra um evento por intervalo, **cidade a cidade**, desde o centro de distribuição até a casa do cliente. O pedido só vira **Entregue** quando chega o evento de entrega. Para pular direto: `orders:advance PED-… delivered`. O selo **"Comprou este produto"** das avaliações só aparece depois de entregue.

---

## 6. Comandos úteis

```bash
# Qualidade (o mesmo que roda no CI)
./vendor/bin/sail composer run ci:check      # lint/tipos do front + Pint + Larastan + testes
./vendor/bin/sail artisan test --compact     # só os testes
./vendor/bin/sail npm run check              # lint e formatação do front
./vendor/bin/sail npm run types:check        # TypeScript

# Dados
./vendor/bin/sail artisan messaging:setup    # (re)cria exchanges, filas e DLQs no RabbitMQ
./vendor/bin/sail artisan catalog:import     # reimporta os JSONs (database/seeders/data)
./vendor/bin/sail artisan migrate:fresh --seed

# Operação da loja (demonstração)
./vendor/bin/sail artisan customers:approve {id} [--reject] [--template=default|duplicate-owner]
./vendor/bin/sail artisan orders:advance {numero} {status}
./vendor/bin/sail artisan orders:expire      # expira pedidos pendentes antigos
./vendor/bin/sail artisan orders:track       # próximo evento de rastreamento
```

---

## 7. Rodando sem Sail

É possível, mas o projeto exige **PostgreSQL** (a busca usa `unaccent` e `pg_trgm`, além de índices parciais), então SQLite não serve.

1. Tenha PHP 8.5, Composer, Node 22+ e um PostgreSQL com a extensão disponível.
2. Ajuste no `.env`: `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`. Para dispensar RabbitMQ, use `QUEUE_CONNECTION=database`; para dispensar o Reverb, use `BROADCAST_CONNECTION=log` (o acompanhamento cai para polling); para e-mails, `MAIL_MAILER=log`.
3. `composer install`, `npm install`, `php artisan key:generate`, `php artisan migrate --seed`, `npm run build`.
4. `php artisan serve` (ou `composer run dev`), mais `php artisan queue:work` e `php artisan schedule:work`.

---

## 8. Arquitetura e decisões

```
app/
  Catalog/        importação idempotente dos JSONs
  Pricing/        PriceResolver: preço por cliente, atacado e promoção
  Search/         busca full-text (PostgreSQL)
  Storefront/     apresentadores: único ponto onde preço vira prop de tela
  Cart/           carrinho, validações e CartTotals (serviço único de totais)
  Checkout/       endereços, frete simulado, consulta de CEP
  Orders/         criação do pedido, reservas, estados, processamento, rastreamento
  Payments/       gateway simulado atrás de interface
  Messaging/      eventos de integração (RabbitMQ), consumo idempotente
  Events/         broadcast em tempo real (Reverb)
resources/js/
  pages/          telas Inertia (store, checkout, orders, account, auth)
  components/     componentes reutilizáveis (cards, galeria, carrinho, checkout)
  layouts/        loja, checkout, área do cliente
docs/
  planejamento/   planejamento, decisões (D1 a D37) e checklists por onda
  data/           JSONs originais do desafio (somente leitura)
```

Os fluxos de mensageria (pagamento assíncrono, eventos de integração, rastreamento e resiliência) estão explicados com **animações** em [`docs/mensageria`](docs/mensageria/README.md).

Decisões principais (a lista completa, com justificativas, está em [`docs/planejamento/03-decisoes-e-pendencias.md`](docs/planejamento/03-decisoes-e-pendencias.md)):

- **PostgreSQL em tudo, inclusive no CI**, para a busca e os índices parciais.
- **Banco como fonte única:** os JSONs são importados e depois nenhuma tela, serviço ou teste os lê. `docs/data` nunca é alterado.
- **Estados do pedido em um único enum** com transições válidas, testadas.
- **Reserva de estoque e de crédito na criação do pedido** (com lock de linha), liberada em falha, recusa ou expiração e consumida no pagamento; idempotente.
- **Tempo real com fallback:** o Reverb avisa que algo mudou e a tela recarrega os dados por HTTP; sem o Reverb, o polling assume.
- **Acessibilidade e responsividade:** mobile-first de 320 px a TV e ultrawide, foco visível, `prefers-reduced-motion`, alvos de toque de 44 px.

---

## 9. O que ficou de fora de propósito

- **Cupons de desconto:** existe apenas o campo visual desativado ("Em breve").
- **Painel administrativo da loja:** aprovação de cadastros e avanço de pedidos são feitos por comandos Artisan. O rascunho do painel está em `docs/planejamento/09-gestao-da-loja-futuro.md`.
- **Desativar ou remover usuários e transferir a propriedade da empresa:** fora do escopo por decisão expressa.
- **Gateway de pagamento e transportadora reais:** ambos simulados atrás de interfaces (`PaymentGateway`, `FreightCalculator`), prontos para troca.
- **DLQ dedicada do RabbitMQ** para a fila de pagamento: o job tem tentativas e espera crescente, e a falha definitiva fecha o pedido e devolve as reservas.

---

## 10. Como o projeto foi construído

O uso de IA era permitido e esperado, então o processo foi organizado em ondas, com planejamento e revisão humana:

- **Planejamento primeiro:** rotas, telas, modelo de dados, decisões e checklists em `docs/planejamento`, antes de codar.
- **Divisão de trabalho:** o **Claude Code** cuidou das regras de negócio, do backend, dos testes e da revisão das entregas; o **Antigravity** implementou telas e componentes de front, a partir de contratos de props escritos antes (`resources/js/types`).
- **Revisão:** cada entrega passou por revisão, pelos testes e por `ci:check` (lint, tipos, Larastan e Pest) antes de virar commit; a revisão visual no navegador é manual.
- **Guia de design:** as telas seguem as diretrizes de `docs/planejamento/00-diretrizes.md` (anti "visual genérico de IA", mobile-first, acessibilidade).
