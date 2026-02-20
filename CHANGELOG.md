# Changelog — WebNest

Todas as mudanças relevantes deste projeto estão documentadas neste arquivo.

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
