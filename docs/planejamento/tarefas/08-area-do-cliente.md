# Onda 8: Área do cliente

Status: 🟨 (8.A e 8.B implementadas, falta revisar no navegador; inclui logout, configurações na conta e botão flutuante de tema) · **8.A** depende só da onda 1 e deve ser feita logo depois dela (o preço depende da aprovação); **8.B** depende da onda 7 (pedidos)

## Objetivo

Transformar as telas atuais (login, cadastro, dashboard, configurações) na área do cliente da loja.

## Tarefas

### 8.A Cadastro, aprovação e usuários da empresa

- [x] Reestilizar login/cadastro/recuperação/verificação de e-mail/2FA com o `StoreLayout`, **mantendo as rotas e a lógica do Fortify** e os testes existentes verdes.
- [x] Cadastro cria **empresa (CNPJ, razão social) + usuário dono** em uma transação; empresa nasce `pending`. Validar/mascarar CNPJ (dígitos verificadores).
- [x] Ordem do fluxo (D34): cadastro → **verificação de e-mail do dono** → fila de aprovação do lojista → aprovado/recusado. Cadastro com e-mail não verificado não aparece na fila e não pode ser aprovado.
- [x] (faixa de aviso na loja para pendente/recusado/bloqueado, com link à tela) Tela "Aguardando aprovação": pode entrar e navegar, sem preços e sem compra; ao aprovar/recusar, e-mail ao dono.
- [x] **CNPJ duplicado (D19):** o formulário **não revela** se o CNPJ existe; cria o cadastro pendente com a flag de duplicado; mesma resposta e tempo de resposta para CNPJ novo e existente (evita enumeração); throttle no cadastro. Ao recusar, o **lojista escolhe o e-mail (D35)**: (1) recusa padrão, genérica; ou (2) recusa orientando: "Já existe uma empresa com este CNPJ no sistema. Peça ao administrador da empresa para criar seu acesso pelo painel de usuários." Nunca citar nome da empresa nem do dono.
- [x] Aprovação/recusa pelo lojista via `customers:approve {id} {--reject} {--template=default|duplicate-owner}` até existir o painel (onda 9); dispara os e-mails. Para cadastro com flag de duplicado, o comando pede a escolha do template (D35).
- [x] **Painel de usuários da empresa** (só o dono, `/conta/usuarios`): **listar e criar/vincular** usuário (nome, e-mail); o novo usuário nasce aprovado e recebe e-mail de convite com link para definir a senha (D32). E-mail já em uso: mensagem genérica sem revelar de qual empresa.
- [ ] **NÃO implementar** desativação/remoção de usuários nem transferência de propriedade (ordem expressa; ver [03](../03-decisoes-e-pendencias.md#fora-de-escopo-não-implementar-ordem-expressa)). Em dúvida, perguntar.
- [x] Testes: dono vincula usuário sem aprovação; membro não vincula; usuário de outra empresa não acessa o painel; CNPJ duplicado não vaza existência e fica marcado; recusa envia o template escolhido (padrão ou orientando o administrador); e-mail não verificado não entra na fila; pendente não vê preço nem compra; aprovado vê; recusado bloqueado; visitante.

### 8.B Área do cliente

- [x] `AccountLayout` e `account.dashboard`: pedidos recentes, limite de crédito disponível, atalhos; ajustar `config/fortify.php` (`home`) e redirecionar `/dashboard`.
- [x] Pedidos **da empresa**: lista com filtro por status, detalhe, repetir pedido (preenche o carrinho do usuário respeitando preço/estoque atuais).
- [x] Endereços **da empresa**: CRUD (reutiliza o componente da onda 6).
- [x] Lista de desejos **do usuário**: listagem, mover para o carrinho, remover.
- [x] Configurações existentes (perfil, segurança, aparência) acessíveis pelo menu da conta.
- [x] Redirecionamento pós-login para a página de origem (ex.: produto/checkout).
- [x] Testes: isolamento entre usuários (carrinho/desejos) e entre empresas (pedidos/endereços), redirecionamentos, repetir pedido; atualizar `DashboardTest` e correlatos.

## Pontos de atenção

- Escopo dos dados (D24): endereços e pedidos **da empresa**; carrinho e lista de desejos **do usuário**.
- E-mail de usuário é único no sistema: um e-mail só pertence a uma empresa.

## Melhorias futuras

- Desativação de usuários e transferência de propriedade (hoje fora de escopo); segunda via de boleto; notas fiscais.

## Definição de pronto

- [ ] Itens marcados · ci:check verde.
