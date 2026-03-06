# WebNest — Gerenciador de Links

Organize seus links favoritos com estilo e segurança.

## What's new — 0.14.1 (2026-03-06)

Detalhes completos da release: [CHANGELOG 0.14.1](CHANGELOG.md#0141--2026-03-06)

- **Metadados mais confiáveis** no cadastro de links com fallback em camadas (Microlink → OtherMeta → noembed → local)
- **Fallback local automático** para preencher título/favicon quando APIs externas falham
- **Submit mais robusto**: busca metadados faltantes no envio e normaliza URL com `https://` quando necessário
- **Preview melhorado** com indicador de origem dos metadados (Web vs Local)
- **Padronização global de tokens de UI** para reduzir duplicação de classes e melhorar manutenção
- **Validação concluída** com build de produção sem erros

## Funcionalidades

### Core

- **CRUD completo** de links com favicon, preview OG, tags e notas
- **Categorias hierárquicas** (3 níveis) com cores, ícones personalizados e drag & drop
- **1541 ícones** do Lucide + upload de ícones customizados (SVG, PNG, JPG)
- **Busca avançada** com filtros por categoria, tags, período e favoritos
- **Auto-fetch de metadados** (título, descrição, OG image) ao inserir URL
- **Detecção de URLs duplicadas** com normalização inteligente
- **Auto-save de rascunho** no formulário de criação

### Visualização

- **6 modos de visualização**: Grid, Lista, Cartões, Tabela, Board (Kanban), Galeria
- **Galeria com Covers** — Layout masonry com imagens OG como capas grandes
- **Tamanho dinâmico** nos cartões (P/M/G)
- **Colunas ajustáveis** no grid (2-5 colunas)
- **Breadcrumb Navigation** — Navegação por migalhas na hierarquia de categorias

### Organização

- **Drag & Drop** para reordenar links com Undo/Redo (Ctrl+Z/Y)
- **Operações em Lote (Batch)** — Seleção com checkboxes em todas as views, Shift+Click para intervalo, ações: favoritar, mover, tag (+/-), excluir
- **Lixeira / Soft Delete** — Links deletados ficam na lixeira por 30 dias
- **Notas em Rich Text (Tiptap)** — Editor WYSIWYG com toolbar completa: formatação, listas, task lists, links, blocos de código, citações
- **8 temas** visuais (Light, Dark, Ocean, Sunset, Forest, Rose, Lavender, Midnight)

### Ferramentas

- **Broken Link Checker** — Verificador de links com status HTTP e cache 24h
- **Dashboard de estatísticas** com gráficos interativos (Recharts)
- **Importar/Exportar** em 4 formatos: JSON, CSV, HTML, Bookmarks
- **Histórico de atividades** com log completo de ações
- **Command Palette** (Ctrl+K) e 10+ atalhos de teclado

### Infraestrutura

- **PWA + Offline** com cache local e fila de sincronização
- **Segurança**: RLS, PKCE auth, rate limiting, API key rotation, CSP headers
- **Error Boundary** + logging centralizado (com Sentry/LogRocket opcionais)
- **Docker** multi-stage com variantes dev, prod e nginx

## Tecnologias

- **Framework:** React 18 + TypeScript 5
- **Build:** Vite 7 (SWC)
- **UI:** Shadcn/UI + Radix UI + Tailwind CSS
- **Rich Text:** Tiptap (ProseMirror)
- **Banco de Dados:** Supabase (PostgreSQL)
- **Gráficos:** Recharts
- **Validação:** Zod
- **Testes:** Vitest + React Testing Library

## Como rodar

```sh
# Clonar o repositório
git clone <YOUR_GIT_URL>
cd webnest

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais Supabase

# Iniciar servidor de desenvolvimento
npm run dev
```

## Scripts disponíveis

| Comando | Descrição |
| --------- | ---------- |
| `npm run dev` | Servidor de desenvolvimento (porta 8080) |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |
| `npm run lint` | Linting com ESLint |
| `npm test` | Testes com Vitest |

## Deploy

O projeto suporta deploy via Docker ou qualquer provedor de hospedagem estática (Vercel, Netlify, etc.).

Consulte [DOCKER.md](DOCKER.md) para instruções de deploy com Docker.

## Domínio customizado

Configure o domínio no seu provedor de hospedagem apontando para o build estático gerado em `dist/`.
