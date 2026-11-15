# Mapa de rotas e telas

Duas áreas separadas por layout e prefixo:

- **Loja** (pública para navegar; compra exige login de cliente B2B).
- **Conta** (área do cliente; reaproveita as telas atuais de login, dashboard e configurações).

Em B2B os preços dependem do cliente. **Decidido:** visitante e cliente ainda não aprovado navegam o catálogo **sem ver preços** ("Entre para ver seu preço" / "Cadastro em análise"); após login **e** aprovação do lojista, veem o preço da tabela do cliente e podem comprar. Ver [03](03-decisoes-e-pendencias.md) (D13–D16).

## Loja

| Rota (nome)                                             | Método            | Tela / ação                                                                     | Acesso  | Onda |
| ------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------- | ------- | ---- |
| `/` (`home`)                                            | GET               | Home com vitrine                                                                | público | 2    |
| `/buscar` (`search.index`)                              | GET               | Busca avançada: resultados, filtros, categorias (destino de Enter/botão Buscar) | público | 3    |
| `/buscar/sugestoes` (`search.suggest`)                  | GET               | JSON com até 5 sugestões do navbar                                              | público | 3    |
| `/categorias/{slug}` (`categories.show`)                | GET               | Listagem por categoria                                                          | público | 3    |
| `/produtos/{slug}` (`products.show`)                    | GET               | Detalhe do produto                                                              | público | 4    |
| `/produtos/{produto}/avaliacoes` (`reviews.store`)      | POST              | Enviar avaliação                                                                | cliente | 4    |
| `/desejos` (`wishlist.*`)                               | GET/POST/DELETE   | Lista de desejos                                                                | cliente | 4/8  |
| `/newsletter` (`newsletter.store`)                      | POST              | Inscrição                                                                       | público | 2    |
| `/carrinho` (`cart.show`)                               | GET               | Página do carrinho                                                              | cliente | 5    |
| `/carrinho/itens` (`cart.items.*`)                      | POST/PATCH/DELETE | Operações do carrinho                                                           | cliente | 5    |
| `/checkout/entrega` (`checkout.shipping`)               | GET/POST          | Endereço + frete (campo de cupom só visual, desativado)                         | cliente | 6    |
| `/checkout/pagamento` (`checkout.payment`)              | GET/POST          | Revisão + forma de pagamento                                                    | cliente | 7    |
| `/pedidos/{pedido}/processando` (`orders.processing`)   | GET               | Tela temporária de acompanhamento                                               | cliente | 7    |
| `/pedidos/{pedido}/confirmacao` (`orders.confirmation`) | GET               | Resultado final                                                                 | cliente | 7    |

## Conta (área do cliente)

| Rota (nome)                                       | Tela                                                   | Onda |
| ------------------------------------------------- | ------------------------------------------------------ | ---- |
| `/entrar`, `/cadastro`, recuperação de senha, 2FA | Telas de auth existentes, reestilizadas para a loja    | 8    |
| `/cadastro/aguardando-aprovacao`                  | Aviso de cadastro em análise pelo lojista              | 8    |
| `/conta` (`account.dashboard`)                    | Resumo: pedidos recentes, limite de crédito disponível | 8    |
| `/conta/pedidos` e `/conta/pedidos/{pedido}`      | Histórico e detalhe do pedido                          | 8    |
| `/conta/enderecos`                                | CRUD de endereços                                      | 6/8  |
| `/conta/usuarios`                                 | Painel de usuários da empresa (somente dono)           | 8    |
| `/conta/desejos`                                  | Lista de desejos                                       | 8    |
| `/settings/*` (existente)                         | Perfil, segurança, aparência                           | 8    |

Observação: a rota atual `dashboard` será realocada para `account.dashboard`; ajustar também `config/fortify.php` (`'home' => '/dashboard'`), redirecionamento da URL antiga e os testes existentes (`DashboardTest`, auth).

## Layouts

- `StoreLayout`: navbar (home, busca, carrinho, conta), rodapé com newsletter, container responsivo.
- `CheckoutLayout`: navbar reduzida (logo + etapas + voltar ao carrinho) para reduzir distração e abandono.
- `AccountLayout`: navegação lateral (desktop) / abas ou menu (mobile).

## Funil de compra

```
Carrinho → Entrega (endereço, frete) → Pagamento (revisão + forma) → Processando → Confirmação
```

Indicador de etapas visível em todas as telas do funil; dados preservados ao voltar.
