# Diretrizes transversais

Regras obrigatórias para **toda** tela da loja.

## 1. Impeccable como regra permanente

Referência: <https://impeccable.style/>. Objetivo: evitar "AI slop" no frontend. Toda tela é revisada contra esta lista antes de ser dada como pronta.

### Evitar

- Paleta "bege de IA" e gradientes sem propósito.
- Fonte serifada itálica de display e "kickers"/chips decorativos acima de títulos.
- Bordas laterais coloridas como acento (side-tab), pontos pulsantes e excesso de chips de status.
- Card dentro de card; faixas de "ícone em quadradinho" repetidas para listar vantagens.
- Seções numeradas só por decoração.
- Tudo com o mesmo peso visual (sem foco claro).
- Títulos vagos e CTAs genéricos ("Comece agora"). Copy em português, específica e direta.
- Formulários com campos demais, placeholder no lugar de label, aviso "todos os campos obrigatórios".
- Raios de borda inconsistentes e texto de baixo contraste (abaixo de 4,5:1 para texto normal é falha).

### Aplicar

- **Uma ação primária por tela**, um ponto focal claro; hierarquia por tamanho, peso e posição, não por decoração.
- Usar tokens e componentes já existentes em `resources/js` (Tailwind/shadcn do starter kit) antes de criar novos. Cor de destaque é escassa.
- Hierarquia de títulos sem pular níveis (h1 → h2 → h3).
- Espaçamento e raios consistentes (escala única definida na onda 1).
- Alvos de toque de pelo menos 44×44 px no mobile.
- Motion curto e sutil: 150–200 ms, ease-out, pequenas elevações/escala; listas com escalonamento leve. Respeitar `prefers-reduced-motion`.
- Estados de carregamento com skeleton, estados vazios com orientação do próximo passo, estados de erro com recuperação.

### Verificação

- Quando disponível, rodar o detector/skills do Impeccable (`critique`, `audit`, `polish`) em cada tela e registrar o resultado no PR/commit.
- Registrar achados e correções no checklist da onda.

## 2. Mobile-first e responsividade

Escrever CSS base para o menor viewport e **subir** com `min-width`. Nunca depender de hover para ação essencial.

| Faixa           | Largura aprox.       | Tailwind                 | Layout esperado                                                                                |
| --------------- | -------------------- | ------------------------ | ---------------------------------------------------------------------------------------------- |
| Celular pequeno | 320–374 px           | base                     | 1 coluna, navbar compacta, busca em overlay                                                    |
| Celular         | 375–639 px           | base / `sm`              | 1–2 colunas de produtos, barra de ação fixa no rodapé                                          |
| Tablet          | 640–1023 px          | `sm` / `md`              | 2–3 colunas, filtros em drawer                                                                 |
| Desktop         | 1024–1535 px         | `lg` / `xl`              | 4 colunas, filtros laterais, resumo do carrinho fixo ao lado                                   |
| Monitor grande  | 1536–2559 px         | `2xl`                    | Container máximo centralizado, mais colunas na grade                                           |
| Ultrawide       | ≥ 2560 px            | breakpoint extra (`3xl`) | Largura máxima do conteúdo limitada; sem linhas de texto gigantes; vitrine pode ganhar colunas |
| TV (10-foot UI) | 1920 px+ a distância | mesmo conjunto           | Tipografia escalável (`clamp`), alvos grandes, foco visível e navegação por D-pad/teclado      |

Regras:

- [ ] Container com largura máxima (ex.: 1440 px) e centralização; em ultrawide não esticar conteúdo.
- [ ] Tipografia fluida (`clamp()`) para títulos; corpo ≥ 16 px.
- [ ] Imagens responsivas (`srcset`/`sizes`, `loading="lazy"`, dimensões reservadas para evitar CLS).
- [ ] Testar também em orientação paisagem do celular e com zoom de texto 200%.
- [ ] Respeitar áreas seguras (`env(safe-area-inset-*)`) em barras fixas.
- [ ] Foco visível e ordem de tab lógica (essencial para TV/teclado).
- [ ] Matriz de teste mínima: 360×800, 390×844, 768×1024, 1280×800, 1920×1080, 2560×1080 (ultrawide), 3840×2160 (TV/4K).

## 3. Acessibilidade

- Contraste mínimo 4,5:1 (texto) e 3:1 (componentes de UI).
- Landmarks (`header`, `nav`, `main`, `footer`), `aria-live` para contador do carrinho e resultado de busca.
- Formulários: `label` sempre visível, mensagens de erro associadas ao campo, `autocomplete` correto.
- Carrossel e galeria operáveis por teclado, com pausa do autoplay.

## 4. Convenções de código

- **Idioma (D29):** identificadores, tabelas, colunas e enums em inglês; textos de interface e e-mails em pt-BR.
- **`docs/` não é runtime (D26):** nunca referenciar `docs/` em código da aplicação, rotas, testes ou CI.
- **Testes (D27/D28):** factories, banco PostgreSQL, tempo congelado para tudo que depende de data (promoções, expiração).
- **Privacidade de preço:** preço e dados dependentes do cliente **nunca** entram nas props Inertia nem em JSON para visitante/cliente não aprovado; nunca cachear página/resposta com preço de forma compartilhada entre usuários.
- **E-mails:** sempre em fila, em pt-BR; em desenvolvimento chegam ao Mailpit do Sail.

- Seguir `AGENTS.md`: Wayfinder para rotas, Inertia v3 + React, Pest, Pint, `ci:check`.
- Dinheiro sempre em centavos (inteiro) no banco e nos cálculos; formatar só na apresentação (`Intl.NumberFormat('pt-BR')`).
- Regras de negócio em classes de domínio/Actions testáveis, não em controllers.
- Ao criar models: factory e seeder junto.
