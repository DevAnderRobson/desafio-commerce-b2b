# Onda 2: Home

Status: ✅ implementada (falta a revisão visual no navegador) · Depende de: onda 1

## Objetivo

Home que apresenta a loja e leva ao produto: vitrine, carrosséis, promoções/mais vendidos e newsletter. Uma ação primária: encontrar/comprar produtos.

## Tarefas

### 2.1 Vitrine (hero)

- [x] Destaque principal com título específico e um CTA (ex.: "Ver ofertas da semana"), sem gradiente decorativo nem copy genérica.
- [x] Atalhos para as 5 categorias.
- [x] Mobile-first: hero em coluna única; em ultrawide, largura de conteúdo limitada.

### 2.2 Carrosséis de produtos

- [x] Carrossel acessível (setas, teclado, swipe, `aria-roledescription`, sem autoplay agressivo; pausa se houver autoplay).
- [x] Seções: **Em promoção** (promoções vigentes), **Mais vendidos** (dados de pedidos), **Novidades/Destaques**.
- [x] Props adiadas (`Inertia::defer`) com skeleton por seção.
- [x] Quantidade de itens visíveis por breakpoint (1,5 no celular; 2–3 tablet; 4–6 desktop; mais em ultrawide).
- [x] Cliente aprovado: preço com selo de promoção e percentual quando vigente. Visitante: sem preço, "Entre para ver seu preço". Cliente pendente: "Cadastro em análise".
- [x] (card pronto; ação entra na onda 5) Botão "Adicionar" no card (quantidade 1) integrando com o carrinho (onda 5); até lá o botão fica oculto/desativado. Só aparece para cliente aprovado, não bloqueado e produto disponível no modelo dele.

Regras / atenção:

- "Mais vendidos" usa os pedidos entregues de exemplo (seeder demo); esconder a seção se vazia.
- Promoção vencida/futura nunca aparece (nos dados: 1 vigente, 1 vencida, 1 futura; o seeder demo cria promoções extras para encher o carrossel).
- Respostas com preço não podem ser cacheadas de forma compartilhada entre usuários.
- Produto sem estoque aparece como indisponível, sem botão de adicionar.

### 2.3 Newsletter

- [x] Formulário (e-mail + consentimento) no rodapé/seção da home, rota `newsletter.store`.
- [x] Validação, e-mail único, resposta idempotente (já inscrito não vaza informação). Prioridade P2 (ver [README](../README.md)).
- [x] **Double opt-in:** inscrição fica `pendente`; envia e-mail com link assinado e com expiração; só vira `confirmada` ao clicar; reenvio com throttle; descadastro por link assinado em todo e-mail.
- [x] Throttle por IP; honeypot simples.
- [x] Mensagem de sucesso/erro acessível (`aria-live`).
- [x] Testes: inscrição gera pendente e e-mail, confirmação válida/expirada/adulterada, duplicada, e-mail inválido, throttle, descadastro.

Pontos de atenção: LGPD (texto de consentimento, descadastro); confirmação por e-mail (double opt-in) é obrigatória.

## Melhorias futuras

- Banners gerenciáveis pela gestão da loja; recomendações por histórico de compra do cliente.

## Definição de pronto

- [ ] Revisão Impeccable e dos breakpoints no navegador (você).
- [x] Itens marcados · ci:check verde.
