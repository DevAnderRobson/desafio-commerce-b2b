# Onda 4: Detalhe do produto

Status: 🟨 (implementada; revisão visual pendente; 4.6 integra na onda 5) · Depende de: ondas 1 e 3 (card/preço); carrinho integra na onda 5; o selo "Comprou" usa pedidos entregues (seeder demo até a onda 7 existir)

## Objetivo

Página que permite decidir a compra: ver imagens, preço do cliente, ficha técnica, compartilhar, favoritar, avaliar e adicionar ao carrinho.

## Tarefas

### 4.1 Galeria de imagens com zoom

- [ ] Imagem principal + miniaturas (carrossel horizontal no mobile, coluna lateral no desktop).
- [ ] Ampliar em lightbox/tela cheia; zoom por pinça e duplo toque (mobile), roda/clique e lupa (desktop), teclado (+/−/setas/Esc).
- [ ] `srcset`/`sizes`, lazy-load, proporção reservada (sem CLS); `alt` descritivo.
- [ ] Imagens de exemplo geradas pelo seeder demo (várias por produto para exercitar galeria/zoom); placeholder quando não houver.

### 4.2 Informações do produto

- [ ] Nome, marca, categoria, SKU/EAN, descrição, características (`product_attributes`).
- [ ] Preço visível só para cliente aprovado; visitante vê "Entre para ver seu preço" e cliente pendente "Cadastro em análise"; produto fora da tabela mostra "Este produto não está disponível para o seu modelo de compra (Padrão/Atacadista)" sem botão de compra.
- [ ] Preço do cliente com origem: atacado (faixa "a partir de N un.") e promoção do produto (preço original riscado + percentual + validade).
- [ ] Disponibilidade (em estoque / poucas unidades / indisponível); limite de "poucas unidades" em constante única (ex.: ≤ 10).
- [ ] Seletor de quantidade com validação (mín. 1, máx. estoque) e preço dinâmico ao atingir a quantidade de atacado.
- [ ] Hierarquia: preço e "Adicionar ao carrinho" são o foco; o restante abaixo, sem cards aninhados.
- [ ] Mobile: botão de adicionar fixo no rodapé (com área segura).
- [ ] Meta tags (título, descrição, Open Graph). **Sem preço** nos metadados nem em dados estruturados, pois o preço não é público (D13).

### 4.3 Compartilhar

- [ ] Web Share API quando disponível; fallback: copiar link com confirmação acessível.
- [ ] URL limpa e canônica (sem parâmetros de sessão/preço).

### 4.4 Lista de desejos

- [ ] Botão favoritar/desfavoritar (otimista, com rollback em erro), estado refletido no card e no detalhe.
- [ ] Exige login; sem login, direciona ao login e retorna ao produto.
- [ ] Lista de desejos é **do usuário** (D24). Testes: adicionar, remover, idempotência, isolamento entre usuários, inclusive da mesma empresa.

### 4.5 Avaliações e comentários

- [ ] Nota 1–5, título opcional, texto; um por usuário/produto (editar em vez de duplicar).
- [ ] **Selo "Comprou este produto" calculado pelo sistema**: só se existir pedido **entregue/recebido** contendo o produto, e o avaliador seja o **usuário que fez a compra** ou o **dono da empresa** (D33); outros membros da empresa que não compraram não recebem o selo. Compra paga mas ainda não entregue **não** habilita o selo. Nunca vem do formulário.
- [ ] Quem não tem pedido entregue do produto recebe a etiqueta "Ainda não comprou" (definida pelo sistema).
- [ ] Exige login e cliente aprovado para avaliar.
- [ ] Resumo: média, distribuição por nota, filtro "somente compradores", ordenação.
- [ ] Paginação, escape de conteúdo (sem HTML), throttle, validação de tamanho.
- [ ] Testes: pedido entregue comprado pelo próprio usuário → selo; dono da empresa avaliando produto que outro membro comprou e já foi entregue → selo; outro membro que não comprou → "Ainda não comprou"; pedido entregue → selo; pedido pago/enviado sem entrega → "Ainda não comprou"; sem histórico idem; pedido cancelado não conta; tentativa de forjar selo via payload; duplicidade.

### 4.6 Adicionar ao carrinho

- [ ] Botão integra com a onda 5 (contador animado no navbar).
- [ ] Estados: carregando, adicionado (confirmação curta), erro de estoque.
- [ ] Cliente bloqueado/sem login: mensagem clara e caminho para resolver.

## Pontos de atenção

- O selo "Comprou" depende do status `entregue` (D17).
- Moderação de avaliações fica para a gestão da loja.
- Produto inativo/inexistente → 404.

## Melhorias futuras

- Fotos nas avaliações; "avaliação útil"; produtos relacionados e "comprados juntos".

## Definição de pronto

- [ ] Itens marcados · ci:check verde · galeria testada em toque, mouse, teclado e TV (foco).
