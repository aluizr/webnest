# Changelog — WebNest

Todas as mudanças relevantes deste projeto estão documentadas neste arquivo.

Versão mais recente: [0.14.1 — 2026-03-06](CHANGELOG.md#0141--2026-03-06)

| Versão | Data | Link |
| --- | --- | --- |
| 0.14.1 | 2026-03-06 | [Ver mudanças](CHANGELOG.md#0141--2026-03-06) |
| 0.14.0 | 2026-02-22 | [Ver mudanças](CHANGELOG.md#0140--2026-02-22) |
| 0.13.0 | 2026-02-21 | [Ver mudanças](CHANGELOG.md#0130--2026-02-21) |

---

## [0.14.1] — 2026-03-06

### Lista estilo Notion (Polimento Visual)

`Layout`

- **Layout da linha refinado**: cards com separação visual mais clara e espaçamento lateral ampliado para dar mais respiro ao conteúdo
- **Densidade da lista**: modos `Compacto`, `Normal` e `Conforto` com persistência por usuário
- **Header de database**: cabeçalho sticky da lista com rótulos de coluna e melhor legibilidade geral
- **Controles externos à linha**: grip + checkbox movidos para gutter externo à esquerda, aproximando o comportamento visual do Notion
- **Ajustes finos de tipografia e espaçamento**: melhor separação entre descrição e URL, alinhamento vertical do texto e bordas suavizadas

`Interação`

- **Ações contextuais**: ações principais no hover com visual mais discreto e alinhado ao estilo Notion
- **Ações no mobile via menu `...`**: adicionado menu contextual na lista para `Editar` e `Excluir`, com fechamento ao clicar fora

`Preview`

- **Preview lateral ajustável**: thumbnail fixa na coluna direita com redimensionamento dinâmico por alça (drag), limite mínimo/máximo e persistência em `localStorage`
- **Persistência de visualização**: `viewMode` agora é salvo em `localStorage` e restaurado automaticamente ao reabrir a aplicação
- **Presets de thumbnail no header**: botões `S / M / L` para alternar rapidamente a largura da preview sem arrastar a alça

### Temas Claros (Mais Distintos)

- **Novos perfis claros autorais**: adicionados temas `Paper`, `Mint` e `Peach` com identidade visual própria
- **Diferença visual reforçada**: ajustes de `background`, `card`, `accent`, `border` e atmosfera de fundo por tema para reduzir semelhança entre os modos claros
- **Integração completa**: novos temas disponíveis no seletor (`ThemeToggle`), no `ThemeProvider` e no atalho de teclado `D` (ciclo de temas)

### Tema Escuro e Transição de Tema

- **Legibilidade no escuro melhorada**: tokens do tema `dark` ajustados para superfícies mais claras e maior contraste de texto/bordas.
- **Animação configurável de troca de tema**: novo controle `Suave/Forte` no seletor de temas com persistência em `localStorage` (`theme-motion-intensity`).
- **Modo sem animação**: adicionada opção `Sem` no seletor para desativar completamente o efeito de troca de tema.
- **Efeito global com acessibilidade**: transição visual aplicada no `html` via `data-theme-motion`, respeitando `prefers-reduced-motion`.

### Tabela (Pacote V1)

- **Colunas configuráveis com persistência**: mostrar/ocultar colunas da tabela e salvar preferências em `localStorage`.
- **Presets de layout da tabela**: atalhos `Compacta`, `Analise` e `Completa` para alternar rapidamente conjuntos de colunas.
- **Redimensionamento de colunas**: arraste no header para resize com persistência de largura; duplo clique na alca para auto-fit.
- **Ordenação multi-coluna**: clique no header para ordenar; `Shift+clique` adiciona novos critérios de ordenação.
- **Filtros por coluna**: filtros rápidos para texto, categoria, tag, status, prioridade e favoritos.
- **Contador e limpeza rapida**: indicador `X de Y links` + botao para limpar filtros e ordenacao.
- **Edicao inline**: atualizacao direta em celula para `titulo`, `categoria`, `tags` e `prazo`, alem de `status` e `prioridade` via seletor na propria linha.
- **Navegacao por teclado na edicao**: suporte a `Tab` e `Shift+Tab` para avancar/retroceder entre celulas editaveis, incluindo troca para a proxima/anterior linha.
- **Foco visual de celula ativa**: destaque da celula em edicao inline com realce de borda/fundo para leitura tipo planilha.
- **Contexto de linha ativa**: linha com celula em edicao recebe realce sutil para facilitar orientacao em tabelas largas.
- **Header sticky na tabela**: cabecalho com colunas permanece visivel durante scroll vertical para manter contexto de leitura/edicao.
- **Coluna Titulo fixa**: primeira coluna de conteudo permanece visivel no scroll horizontal para preservar contexto da linha.
- **Coluna Acoes fixa**: acoes da linha permanecem acessiveis no scroll horizontal com ancora a direita.
- **Indicadores de scroll horizontal**: fade nas bordas esquerda/direita da tabela sinaliza conteudo fora da viewport.
- **Snap horizontal suave**: ao parar o scroll lateral, a tabela alinha automaticamente na borda de coluna mais proxima (respeitando `prefers-reduced-motion`).
- **Modo de densidade da tabela**: novo controle `Compacta/Normal` com persistencia em `localStorage` para caber mais conteudo na mesma pagina.
- **Descricao editavel inline**: duplo clique na descricao para edicao direta na celula (textarea), com `Ctrl+Enter` para salvar rapido.
- **Chips de prazo na tabela**: filtros rapidos `Vencido`, `Hoje`, `7 dias` e `Sem prazo` para triagem de tarefas com data.
- **Desfazer em edicoes inline**: toast de confirmacao com acao `Desfazer` para atualizacoes inline (titulo, descricao, categoria, tags, prazo, status e prioridade).

### Sidebar (Menu Esquerdo)

- **Reordenacao por arraste corrigida**: drag & drop de categorias no menu esquerdo agora usa alvo explicito de drop e ficou mais confiavel.
- **Reordem por nivel**: atualizacao de `position` aplicada apenas entre categorias irmas (mesmo `parentId`), evitando efeitos colaterais em outros niveis.
- **Grip mais visivel**: alca de arraste (`GripVertical`) com opacidade maior para melhorar descoberta da funcionalidade.
- **Linha guia de drop**: indicador visual `top/bottom` durante drag de categoria, deixando claro onde o item sera inserido.
- **Feedback de encaixe**: animacao curta (`snap`) no item apos drop bem-sucedido para confirmar visualmente a reordenacao.

### Board (Pacote V1)

- **Edicao inline de titulo**: duplo clique no titulo do card para editar sem abrir modal.
- **Filtros rapidos por coluna**: controles `Todos`, `Fav`, `Alta` e `Urg` por status (Backlog/Em progresso/Concluido).
- **Indicadores de urgencia por prazo**: badge de prazo com destaque para itens vencidos e para hoje.
- **Contador filtrado por coluna**: exibicao `visiveis/total` em cada cabecalho de coluna para feedback imediato dos filtros.
- **Prioridade inline no card**: seletor direto no Board para alterar prioridade sem abrir modal.
- **Status inline no card**: seletor direto no Board para mover entre `Backlog`, `Em progresso` e `Concluido` sem depender apenas de drag & drop.

### Correções de Metadados (Adicionar Link)

- **Resiliência no carregamento de metadados**: fluxo do `useMetadata` com cadeia de fallback `Microlink -> OtherMeta -> noembed -> local`
- **Fallback local garantido**: quando APIs externas não retornam dados, título básico e favicon são derivados da URL
- **Timeout de requisições**: fetch de metadados com timeout para evitar travamentos em provedores lentos/instáveis
- **Submit mais robusto**: ao salvar novo link, o formulário tenta buscar metadados faltantes no envio (não apenas durante digitação)
- **URL normalizada no submit**: URLs sem protocolo passam a ser normalizadas com `https://` para reduzir falhas de coleta
- **Preview resiliente**: parsing de hostname no preview não quebra quando a URL ainda está incompleta
- **Origem dos metadados exposta**: campo `source` em `LinkMetadata` (`microlink`, `othermeta`, `noembed`, `local`)
- **Indicador visual de origem**: badges no preview distinguem dados vindos da web vs fallback local

### Design System / Padronização de Tokens UI

- **Tokens compartilhados adicionados** em `src/lib/utils.ts`:
  - `COMPACT_BADGE_CLASS`
  - `TEXT_XS_CLASS`
  - `ICON_BTN_SM_CLASS`
  - `ICON_BTN_MD_CLASS`
- **Refatoração ampla de classes utilitárias duplicadas** (`text-xs`, `h-6 w-6`, `h-7 w-7`, badge compacto) para usar tokens compartilhados
- **Escopo da padronização**: aplicado em views de links, formulários, painéis, diálogos, componentes de suporte e componentes base de UI (`ui/badge`, `ui/sidebar`)

### Validação Técnica

- **Build de produção validado** após cada bloco de mudanças (`npm run build`)
- **Sem erros de tipagem** nos arquivos alterados durante a refatoração

### Correções (0.14.1)

- **Temas personalizados restaurados**: corrigida a importação global de estilos em `src/main.tsx` para usar `src/index.css` (em vez de `public/output.css`), garantindo aplicação correta das paletas `Oceano`, `Floresta`, `Rosé` e demais temas.
- **Remoção de CSS legado**: arquivo `public/output.css` removido para evitar regressões e importações acidentais no bootstrap da aplicação.

---

## [0.14.0] — 2026-02-22

### Operações em Lote (Batch) — Aprimoradas

- **Seleção em todas as views**: Checkboxes agora disponíveis em Grade, Lista, Cartões, Tabela, Board e Galeria
- **Checkbox no header da Tabela**: Selecionar/desmarcar todos com indicador de seleção parcial (traço)
- **Shift+Click para seleção em intervalo**: Selecione um item, segure Shift e clique em outro para selecionar todos entre eles
- **Escape para limpar seleção**: Tecla Escape desfaz toda seleção ativa
- **Remover tag em lote**: Novo botão "-Tag" na barra de ações mostrando todas as tags dos itens selecionados para remoção rápida
- **Toast de feedback**: Todas as operações em lote (excluir, favoritar, mover, adicionar/remover tag) agora mostram feedback visual via toast
- **Destaque visual**: Linhas/cards selecionados com ring e background em todas as views

### Correções (0.14.0)

- **`useEffect` não importado**: `ReferenceError: useEffect is not defined` em `Index.tsx` — adicionado `useEffect` ao import do React (necessário para o listener de Escape adicionado nesta versão)

---

## [0.13.0] — 2026-02-21

### Notas em Rich Text (Tiptap)

- Editor WYSIWYG completo substituindo o antigo textarea + Markdown
- Toolbar com formatação: **Negrito**, *Itálico*, Sublinhado, Tachado, Realce, Código
- Títulos H1–H3, listas com marcadores, numeradas e **task lists** com checkboxes
- Blocos de citação, blocos de código, linhas horizontais
- Inserção e edição de links via popover dedicado
- Desfazer/Refazer integrados
- Componente `RichTextDisplay` para exibição read-only com detecção automática de texto legado
- Estilos CSS dedicados para o editor (task lists, placeholder, blocos de código, citações)
- Dependências: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-underline`, `@tiptap/extension-highlight`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item`, `@tiptap/extension-placeholder`

---

## [0.12.0] — 2026-02-21

### Galeria com Covers

- Nova view **Galeria** (masonry layout) usando imagens OG como capas grandes
- Layout em colunas CSS (`columns`) com transição de hover e zoom suave
- Fallback visual com favicon para links sem imagem OG
- Suporte a seleção em lote na galeria
- Atalho **G** agora cicla entre 6 views: Grade → Lista → Cartões → Tabela → Board → Galeria

### Breadcrumb Navigation

- Navegação por migalhas ao filtrar por categoria
- Exibe hierarquia completa: Todos > Pai > Filho > Neto
- Clique em qualquer nível para navegar diretamente
- Botão "Todos" com ícone Home para voltar à raiz

### Lixeira / Soft Delete

- Links deletados vão para **lixeira** em vez de exclusão permanente
- Coluna `deleted_at` (TIMESTAMPTZ) na tabela `links`
- Painel lateral da lixeira com contagem de itens
- **Restaurar** links individuais da lixeira
- **Excluir permanentemente** links individuais
- **Esvaziar lixeira** com confirmação
- Contador de dias restantes antes da exclusão automática (30 dias)
- Badge com contagem na barra de ferramentas
- Função `purge_old_deleted_links()` no banco para limpeza automática
- Migration: `20260221_soft_delete.sql`

### Operações em Lote (Batch)

- **Seleção múltipla** de links via checkboxes (visível no hover)
- Barra de ações flutuante (bottom bar) quando há seleção:
  - **Selecionar todos** os links visíveis
  - **Favoritar** / **Desfavoritar** em lote
  - **Mover** para categoria (popover com seletor hierárquico)
  - **Adicionar tag** em lote
  - **Excluir** em lote (com confirmação)
- Suporte a seleção nas views Grade, Lista e Galeria

### Broken Link Checker

- Verificador de links com painel lateral dedicado
- Verificação em lotes de 5 (HEAD request + fallback no-cors)
- Barra de progresso durante verificação
- Estatísticas: total, ativos, quebrados
- Lista detalhada de links quebrados com HTTP status
- Cache em `localStorage` (TTL 24h)
- Indicador visual (🛡️) em links quebrados no card
- Botão na barra de ferramentas

### Rich Text Notes (Markdown)

- Notas pessoais agora suportam **Markdown**
- Botão **Preview** no formulário para visualizar Markdown renderizado
- Renderização de Markdown nos cards de link
- Suporte: títulos, **negrito**, *itálico*, `código`, blocos de código, links, imagens, listas, blockquotes, ~~tachado~~, linhas horizontais
- Componente `MarkdownPreview` reutilizável (sem dependências externas)
- ⚠️ Substituído pelo editor Tiptap na v0.13.0

### Correções (0.12.0)

- **`Progress` component missing**: `Failed to fetch dynamically imported module` — `LinkCheckerPanel` importava `@/components/ui/progress` que não existia. Criado componente `Progress` usando `@radix-ui/react-progress` (dep já instalada)

### Melhorias Técnicas

- `LinkItem.deletedAt` adicionado ao tipo TypeScript
- `ActivityAction` ampliado: `link:trashed`, `link:restored`
- `ViewMode` ampliado: `"gallery"`
- Hook `useLinkChecker` com cache, batching e abort controller
- Componente `BatchActionBar` com popover de categorias e tags
- Componente `TrashView` com restauração e exclusão permanente
- Componente `BreadcrumbNav` para navegação hierárquica
- Componente `LinkGalleryView` com layout masonry

---

## [0.11.0] — 2026-02-21

### Sistema de Categorias Aprimorado

#### Ordenação por Drag & Drop

- Campo `position` (INTEGER) adicionado à tabela `categories`
- Arrastar categorias na sidebar para reordená-las (drag handle com `GripVertical`)
- Ordem persistida no banco via `reorderCategories()`

#### Cores de Categoria

- Campo `color` (VARCHAR 7, hex) adicionado à tabela `categories`
- `ColorPicker` na sidebar: 16 cores predefinidas em popover
- Dots de cor exibidos ao lado do nome da categoria na sidebar
- Dots de cor nos cabeçalhos das colunas da visão Board
- Seletor de cor ao criar novas categorias/subcategorias

#### Restrição de Nome Único

- Índice único `idx_categories_unique_name` em `(user_id, name, parent_id)` no banco
- Tratamento de erro no frontend ao tentar criar categoria duplicada

#### Exclusão com Cascata

- Diálogo de confirmação (`AlertDialog`) para **toda** exclusão de categoria
- Categorias sem filhos: "Os links serão movidos para Sem categoria"
- Categorias com filhos: "Subcategorias e links serão movidos para Sem categoria" + botão "Excluir tudo"
- Exclusão recursiva de todos os descendentes via `deleteCategory(id, cascade: true)`

#### Hierarquia de 3 Níveis

- Limite expandido de 2 para 3 níveis de profundidade (Pai → Filho → Neto)
- Renderização recursiva na sidebar (`renderCategory()`)
- Seletor flat no formulário de link com indentação visual por nível

### Sistema de Ícones Renovado

#### 1541 Ícones Lucide

- De ~90 ícones manuais para **todos os 1541 ícones** do `lucide-react` via `icons` export
- `ICON_MAP` e `ICON_NAMES` gerados dinamicamente
- Validação atualizada para aceitar qualquer ícone do Lucide

#### IconPicker Aprimorado

- **20 categorias** navegáveis por pills: Pastas, Livros, Código & Tech, Mídia, Trabalho, Finanças, Social, Segurança, Ferramentas, Navegação, Tempo, Natureza, Comida, Esportes, Viagem, Saúde, Casa, Favoritos, Compras, Arte & Design
- **48 ícones populares** na tela inicial
- **Busca por nome** com até 120 resultados
- Grid 8 colunas com scroll

#### Ícones Personalizados (Upload)

- Aba **"Importar"** no IconPicker para upload de ícones do computador
- Formatos aceitos: SVG, PNG, JPG, WebP, GIF (máx. 32KB)
- Drag & drop ou clique para selecionar arquivo
- Ícone convertido para base64 (data URL) e salvo no banco
- Preview do ícone customizado com botão para remover
- Migração para expandir campo `icon` de `VARCHAR(50)` para `TEXT`
- Helper `isCustomIcon()` para detecção e renderização condicional (`<img>`)

#### Edição de Ícone em Categorias Existentes

- Botão de edição (lápis) agora mostra `IconPicker` + campo de nome
- Ícone atual pré-selecionado ao entrar no modo de edição
- Ícone e nome salvos juntos ao confirmar

### Correções

- **Ícones Exportar/Importar trocados**: `Upload` para Exportar, `Download` para Importar
- **Drag & Drop da esquerda para a direita**: corrigido cálculo de `insertIndex` — item arrastado agora toma a posição original do alvo em ambas as direções
- **Botões aninhados (DOM)**: `ColorPicker` e chevron de expandir usavam `<button>` dentro de `SidebarMenuButton` (também `<button>`) → substituídos por `<div role="button">`
- **Ícone `Alarm` inexistente**: substituído por `AlarmClock` (disponível no lucide-react)

### Migrações

- `20260221_improve_categories.sql` — campos `position`, `color`, índice único de nome
- `20260221_expand_icon_column.sql` — campo `icon` de `VARCHAR(50)` para `TEXT`

---

## [0.10.0] — 2026-02-21

### Visualização de Cartões (Cards View)

- Novo modo de visualização **Cartões** (`cards`) adicionado ao `ViewSwitcher`
- Componente `LinkCardsView.tsx` — tiles compactos em grid responsivo com:
  - Favicon + título truncado
  - Descrição em 1 linha (compacta)
  - Badges de categoria + tags (com indicador `+N` para excedentes)
  - Ícone de notas (`StickyNote`) quando o link tem anotações
  - Ações no hover: abrir link, editar, excluir (com confirmação), favoritar
- Ícone `SquareStack` no seletor de visualização
- Tipo `ViewMode` atualizado para incluir `"cards"`
- Ciclo do atalho `G` atualizado: Grid → Lista → Cartões → Tabela → Board

### Tamanho Dinâmico dos Cartões

- 3 tamanhos disponíveis: **P** (pequeno), **M** (médio), **G** (grande)
- Tipo `CardSize` exportado (`"sm" | "md" | "lg"`)
- Seletor de tamanho no popover do `ViewSwitcher` (visível apenas no modo Cartões):
  - Botões `P / M / G` com highlight no selecionado
  - Controles `-` / `+` para ajuste rápido
- Cada tamanho afeta uniformemente todos os cartões:
  - **P**: grid até 8 colunas, favicon 20px, texto `xs`, 1 tag visível
  - **M**: grid até 6 colunas, favicon 28px, texto `sm`, 2 tags visíveis (padrão)
  - **G**: grid até 5 colunas, favicon 36px, texto `base`, 3 tags, descrição em 2 linhas
- Ícones de ação e badges escalam proporcionalmente ao tamanho selecionado

### Rebranding — Remoção do Lovable

- Dependência `lovable-tagger` removida do `package.json`
- Import e uso de `componentTagger()` removidos do `vite.config.ts` e `SECURITY_FIXES/vite-config-seguro.ts`
- `README.md` reescrito por completo com documentação própria do WebNest (tecnologias, scripts, deploy)
- Referências a "Lovable" removidas de todos os documentos de segurança:
  - `SECURITY_AUDIT.md`, `SECURITY_AUDIT_2026-02-15.md`, `SECURITY_SUMMARY.md`
- `package-lock.json` regenerado sem `lovable-tagger`

---

## [0.9.0] — 2026-02-20

### API Key Rotation

- Módulo `api-key-rotation.ts` com suporte a rotação segura de chaves Supabase (anon key)
- Variável de ambiente `VITE_SUPABASE_FALLBACK_KEY` para chave antiga durante transição
- Fetch wrapper com retry automático: se a primária receber 401/403, tenta a fallback
- Cache da chave ativa em `sessionStorage` (evita retry desnecessário na sessão)
- Logging via `logger.warn()` quando a fallback está em uso
- Funções utilitárias: `validateApiKey()`, `resolveWorkingKey()`, `getRotationStatus()`
- `clearKeyCache()` chamado automaticamente no logout
- Cliente Supabase atualizado para usar chave resolvida + fetch com rotação
- `.env.example` atualizado com documentação da variável fallback

---

## [0.8.0] — 2026-02-20

### Histórico de Alterações (Activity Log)

- Hook `use-activity-log.ts` com persistência em `localStorage` (máx 200 entradas)
- 11 tipos de ação rastreados: criar, editar, excluir, favoritar, reordenar, importar, etc.
- Painel lateral (`ActivityPanel`) com entradas agrupadas por data (Hoje/Ontem/Esta semana/Este mês)
- Ícones e cores específicos por tipo de ação
- Formatação de tempo relativo (há X minutos/horas)
- Botão para limpar histórico
- Logging automático em todas as mutações do `Index.tsx`

### Command Palette (Slash Commands)

- Componente `CommandPalette` com busca, filtro e navegação por teclado (↑↓ Enter Esc)
- 12 comandos pré-configurados: novo link, buscar, 4 modos de visualização, stats, histórico, favoritos, exportar, importar, sair
- Atalhos `/` e `Ctrl+K` para abrir
- Comandos agrupados por categoria (Ações, Visualização, Dados)
- Busca por label, descrição e keywords
- Botões de acesso na barra superior (Clock + Command)

### OG Preview / Cover Image

- Campo `ogImage` adicionado ao tipo `LinkItem` e ao schema Zod
- Auto-captura da imagem OG dos metadados ao inserir URL
- Cover image exibida no topo do `LinkCard` (h-36, object-cover, lazy load)
- Fallback gracioso: imagem escondida em caso de erro de carregamento
- Migration SQL para coluna `og_image` na tabela `links`

### 4 Modos de Visualização

- `ViewSwitcher` com popover: Grid, List, Table, Board
- `LinkTableView`: tabela com colunas (favicon, título, descrição, categoria, tags, data, ações)
- `LinkBoardView`: kanban horizontal agrupado por categoria com cards e OG image
- Grid size customizer: botões +/- para ajustar 2-5 colunas na visualização grid

---

## [0.7.0] — 2026-02-20

### Error Boundary + Logging Centralizado

#### Sistema de Logging (`logger.ts`)

- 5 níveis: `debug`, `info`, `warn`, `error`, `fatal`
- Persistência em `localStorage` (últimos 100 erros, chave `webnest-error-log`)
- Handlers globais para `window.onerror` e `unhandledrejection`
- Funções `identifyUser()` / `clearUserIdentity()` para rastreio por usuário
- `getStoredLogs()` e `exportLogs()` para diagnóstico e suporte
- Integração lazy opcional com Sentry (`VITE_SENTRY_DSN`) e LogRocket (`VITE_LOGROCKET_APP_ID`) — sem dependências obrigatórias

#### Error Boundary (`ErrorBoundary.tsx`)

- Class component com `componentDidCatch` → loga via `logger.fatal()`
- Fallback padrão com UI amigável: ícone de erro, mensagem, botões "Tentar novamente" e "Recarregar página"
- Stack trace visível apenas em modo dev (collapsible)
- Suporte a fallback customizado (elemento ou render function)
- Dois boundaries no `App.tsx`: um externo (toda a árvore) e um interno (envolvendo `AppRoutes`)

#### Integração de Logging nos Hooks

- `use-links.ts`: `logger.error()` em falhas de add/update/delete link, criar categoria e reordenar
- `use-auth.ts`: `logger.warn()` em falhas de login/cadastro, `identifyUser()` no login e `clearUserIdentity()` no logout

### Favicon Fallback com Avatar Colorido

- Componente `FaviconWithFallback.tsx` integrado no `LinkCard`
- Tenta carregar favicon via `icon.horse`; em caso de falha, exibe avatar colorido
- 16 cores determinísticas por hostname (hash consistente)
- Letra inicial do domínio em maiúscula como fallback visual

### Otimização de Bundle (P0)

#### Manual Chunks (`vite.config.ts`)

- `vendor-react`: React, React DOM, React Router (~83 KB gzip)
- `vendor-supabase`: Supabase JS (~46 KB gzip)
- `vendor-ui`: Radix UI (~27 KB gzip)
- `vendor-charts`: Recharts + D3 (~113 KB gzip)
- Chunk inicial do app reduzido de 166 KB → 27 KB gzip (**-84%**)
- Vendor chunks cacheáveis separadamente pelo browser

#### Limpeza

- Removido `slider.tsx` (componente UI não utilizado)
- Removido `ui/use-toast.ts` (re-export não utilizado)
- Meta tag `apple-mobile-web-app-capable` substituída por `mobile-web-app-capable` (deprecation fix)

---

## [0.6.0] — 2026-02-20

### Rate Limiting & Anti-Abuso

#### Banco de dados

- Trigger `enforce_links_limit` — máximo de **500 links** por usuário
- Trigger `enforce_categories_limit` — máximo de **50 categorias** por usuário
- Trigger `enforce_links_insert_rate` — máximo de **10 inserções em 60 segundos** (anti-spam)
- Índice único `idx_links_user_url_unique` em `(user_id, url)` — previne URLs duplicadas por usuário no nível do banco
- Índice `idx_links_user_created` para performance das queries de rate limiting

#### Client-side

- Módulo `rate-limiter.ts` com sliding window por operação:
  - `link:create` 10/min, `link:update` 30/min, `link:delete` 20/min, `link:favorite` 40/min, `link:reorder` 15/min
  - `category:create` 10/min, `category:delete` 10/min, `category:rename` 20/min
  - `auth:signin` 5 por 5 min, `auth:signup` 3 por 10 min
- Todas as mutações em `use-links.ts` envolvidas com `withRateLimit()`
- Login e cadastro em `use-auth.ts` protegidos com rate limiting
- Toast de erro exibido ao atingir limite
- 14 testes unitários para o rate limiter

---

## [0.5.0] — 2026-02-19

### PWA + Suporte Offline

- **Service Worker** gerado automaticamente via `vite-plugin-pwa` + Workbox
- **Web App Manifest** com nome, ícones SVG (192x192, 512x512), tema `#6366f1`, display standalone
- **Pré-cache** de todos os assets estáticos (JS, CSS, HTML, ícones, fontes)
- **Cache runtime** de favicons (icon.horse — CacheFirst, 30 dias) e API Supabase (NetworkFirst, 24h)
- Hook `use-pwa.ts` — verifica atualizações a cada 60 min, notifica o usuário com toast interativo
- Hook `use-offline-status.ts` — detecta estado online/offline reativamente
- Módulo `offline-cache.ts` — cache de links e categorias no `localStorage`, fila de ações pendentes
- Componente `OfflineIndicator.tsx` — banner flutuante amarelo "Modo offline" com contagem de ações pendentes
- `use-links.ts` atualizado para carregar do cache quando offline e sincronizar automaticamente
- Meta tags PWA no `index.html` (`theme-color`, `apple-mobile-web-app-capable`, `apple-touch-icon`)

### Migração para npm

- Removido `bun.lockb`, projeto agora usa `npm` como gerenciador de pacotes

---

## [0.4.0] — 2026-02-17

### Notas nos Links

- Campo `notes` (TEXT) adicionado à tabela `links` via migration
- Textarea no formulário de criação/edição com ícone `StickyNote`
- Indicador visual no card quando o link tem notas
- Validação Zod: máximo de 5000 caracteres
- Incluído em exportação e importação (JSON, CSV, HTML, Bookmarks)

### Dashboard de Estatísticas

- Hook `use-stats.ts` com cálculos memoizados
- **Visão geral**: total de links, favoritos, categorias, tags, adicionados hoje
- **Distribuição por categoria**: gráfico de pizza (Recharts) com paleta de 8 cores
- **Nuvem de tags**: gráfico de barras horizontais (top 20 tags)
- **Crescimento**: gráfico de linhas duplo — total acumulado + adições diárias
- **Atividade por período**: semana, mês, ano, total
- 15 testes unitários para estatísticas

### Exportação (4 formatos)

- **JSON**: array completo de dados
- **CSV**: headers + rows com escape de vírgulas, aspas e quebras de linha
- **HTML**: documento estilizado com tabela responsiva, badges coloridas, favicons, estatísticas no cabeçalho
- **Bookmarks**: formato Netscape (compatível com Chrome, Firefox, Safari, Edge), categorias como pastas
- Dialog de seleção de formato com ícones e descrições
- 8 testes unitários para exportação CSV

### Importação (4 formatos)

- **JSON**: validação de estrutura + Zod por item
- **CSV**: detecção flexível de colunas (case-insensitive), parsing de campos entre aspas
- **HTML**: extrai links de tabelas HTML exportadas
- **Bookmarks**: auto-detecta formato Netscape, converte pastas em categorias
- Limite de segurança: 5MB por arquivo, 1000 links por importação
- Preview de resultado com contagem de sucesso/erro antes de confirmar

### Atalhos de Teclado

- `N` — Novo link
- `/` ou `Ctrl+K` — Focar busca
- `G` — Alternar grade/lista
- `D` — Alternar entre 8 temas
- `S` — Abrir estatísticas
- `E` — Abrir exportação
- `I` — Abrir importação
- `Escape` — Desfocar campo ativo
- Desativados durante digitação em inputs

### Auto-Save de Rascunho

- Hook `use-link-draft.ts` salva estado do formulário no `localStorage`
- Debounce de 500ms nas mudanças
- Dialog de recuperação ao abrir o formulário ("Rascunho encontrado — Recuperar ou Descartar?")
- Badge "💾 Rascunho" quando ativo
- Limpo automaticamente após submissão

### Detecção de URLs Duplicadas

- Hook `use-duplicate-detector.ts` com normalização de URL
- Remove protocolo, `www.`, trailing slash, query params e hash
- Comparação case-insensitive
- Warning inline no formulário com opção "Adicionar mesmo assim"
- 9 testes unitários

### Busca Avançada

- Painel de filtros expansível com:
  - Busca textual em título, URL, descrição, notas e tags
  - Filtro por categoria (incluindo `Pai / Filho`)
  - Filtro por período: Todos, Última semana, Último mês, 3 meses, Último ano
  - Ordenação: Manual, Mais recentes, Mais antigos, A-Z, Favoritos primeiro
  - Filtro de favoritos (checkbox)
  - Filtro multi-tag com badges removíveis
  - Botão "Limpar filtros" quando há filtros ativos
- 13 testes unitários para `filterAndSortLinks()`

### Sistema de 8 Temas

- Light, Dark, Ocean, Sunset, Forest, Rose, Lavender, Midnight
- Popover visual com preview de cor e ícone para cada tema
- Checkmark no tema selecionado

### Docker

- `Dockerfile` multi-stage (Node 20 Alpine → `serve -s dist`)
- `docker-compose.yml` com health check e restart policy
- Variações: `Dockerfile.dev`, `Dockerfile.nginx`, `docker-compose.dev.yml`, `docker-compose.all.yml`
- Documentação em `DOCKER.md`

---

## [0.3.0] — 2026-02-16

### Hierarquia de Categorias (Subcategorias)

- Campo `parent_id` (UUID nullable) adicionado à tabela `categories` via migration
- FK para `categories.id` com `ON DELETE SET NULL`
- Constraint: categoria não pode ser pai de si mesma
- Suporte a **2 níveis** de hierarquia (Pai → Filho)
- Sidebar atualizada com categorias expansíveis e filhas indentadas
- Botão "Adicionar subcategoria" ao passar o mouse na categoria pai
- Selector de dois níveis no formulário de link (Categoria → Subcategoria)
- Renomear pai propaga nome para todas as subcategorias nos links
- Deletar pai bloqueado se tem filhos ("Remova as subcategorias primeiro")
- Filtro de busca inclui categorias `Pai / Filho`

### Documentação

- `PROJECT_ANALYSIS.md` — análise completa do projeto (estrutura, bundle, performance, otimizações)

---

## [0.2.0] — 2026-02-15

### Autenticação

- Campos `user_id` adicionados às tabelas `links` e `categories` (FK → `auth.users`, CASCADE)
- Políticas RLS permissivas removidas
- 8 novas políticas RLS com escopo por usuário (SELECT/INSERT/UPDATE/DELETE)
- Hook `use-auth.ts` com `signIn`, `signUp`, `signOut`
- Página `Auth.tsx` com formulário de email/senha e toggle login/cadastro
- Lazy loading da página principal com `React.lazy()` + `Suspense`

### Auditoria de Segurança

- **5 vulnerabilidades críticas** identificadas e corrigidas:
  - Credenciais Supabase removidas do repositório
  - `.env` adicionado ao `.gitignore`
  - RLS restrita por usuário
  - Fluxo PKCE habilitado no Supabase client
  - Limpeza de sessão no logout
- **Content Security Policy** configurada via HTML meta tag e headers HTTP
- **Headers de segurança**: X-Frame-Options DENY, X-Content-Type-Options nosniff, HSTS 2 anos, Referrer-Policy
- **CORS** restrito ao domínio da aplicação
- **Validação Zod** com whitelist de protocolos (`http`, `https`, `ftp`, `ftps`, `mailto`) e blacklist (`javascript:`, `data:`, `vbscript:`, `file:`)
- Constraints no banco: URL max 2048, título max 255, descrição max 1000, tags max 20
- Favicon trocado de Google para `icon.horse` (mais privado)
- Importação limitada a 5MB e 1000 links
- 20 testes de validação

### Drag & Drop

- Hook `use-drag-drop-manager.ts` (346 linhas) com:
  - Gerenciamento de estado de arrasto (`draggedLink`, `dropZoneId`, `dragDirection`)
  - **Undo/Redo** com Ctrl+Z / Ctrl+Y
  - Auto-scroll ao arrastar perto das bordas (100px)
  - Preview personalizado do drag (respeita tema claro/escuro)
  - Detecção de direção (acima/abaixo) baseada na posição do mouse
  - Debounce de 50ms no drag leave (anti-flicker)
- Overlay flutuante com botões Undo/Redo e indicador de status
- Campo `position` (INTEGER) adicionado à tabela `links` com índice composto
- Feedback visual: opacidade, escala, borda tracejada, indicadores pulsantes
- 9 testes unitários

### Ícones de Categoria

- Coluna `icon` (VARCHAR 50) com default `'Folder'`
- 27 ícones Lucide disponíveis (Folder, BookOpen, Code, Palette, Music, Video, etc.)
- `IconPicker.tsx` — popover com grade 5×6 e estado de seleção
- Validação: apenas ícones da allowlist aceitos

### Auto-Fetch de Metadados

- Hook `use-metadata.ts` (251 linhas) com:
  - Cache LRU (100 entradas, expiração 24h)
  - API primária: Microlink (`api.microlink.io`)
  - Fallback: OtherMeta (`other.myjson.online`)
  - Normalização de URL para cache keys consistentes
  - Auto-adição de `https://` quando protocolo ausente
- `LinkPreview.tsx` — card de preview com imagem OG, título, descrição, hostname
- Auto-fill de título e descrição no formulário (debounce 500ms)

---

## [0.1.0] — 2026-02-14

### Fundação do Projeto

- Projeto inicializado com Vite + React 18.3 + TypeScript 5.8 + SWC
- Tailwind CSS + Shadcn/UI (29 componentes Radix UI)
- Supabase JS client configurado com `localStorage`
- Roteamento com React Router DOM v7

### Banco de Dados

- Tabela `links`: id, url, title, description, category, tags, is_favorite, favicon, created_at
- Tabela `categories`: id, name
- RLS habilitada (políticas abertas inicialmente)
- 3 categorias padrão: Trabalho, Estudos, Lazer

### Funcionalidades Core

- **CRUD de links**: criar, editar, deletar, favoritar
- **CRUD de categorias**: criar, deletar, renomear
- **LinkCard**: card com favicon, título/URL, descrição, badge de categoria, tags, estrela de favorito, ações de editar/deletar com confirmação
- **LinkForm**: dialog de criação/edição com campos URL, título, descrição, categoria e tags
- **SearchBar**: busca textual em título, URL, descrição e tags
- **AppSidebar**: navegação com "Todos os Links", "Favoritos", lista de categorias e tags
- **ThemeToggle**: alternância claro/escuro
- Toggle entre visualização em grade e lista

### Infraestrutura

- Vitest configurado com jsdom e `@testing-library/jest-dom`
- ESLint com plugins React Hooks e React Refresh
- TypeScript com strict mode e path aliases (`@/`)
