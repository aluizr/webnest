# WebNest — Gerenciador de Links

Organize seus links favoritos com estilo e segurança.

## Funcionalidades

- **CRUD completo** de links com favicon, preview OG, tags e notas
- **Categorias hierárquicas** (3 níveis) com cores, ícones personalizados e drag & drop
- **1541 ícones** do Lucide + upload de ícones customizados (SVG, PNG, JPG)
- **5 modos de visualização**: Grid, Lista, Cartões, Tabela, Board (Kanban)
- **Drag & Drop** para reordenar links com Undo/Redo (Ctrl+Z/Y)
- **Busca avançada** com filtros por categoria, tags, período e favoritos
- **8 temas** visuais (Light, Dark, Ocean, Sunset, Forest, Rose, Lavender, Midnight)
- **Importar/Exportar** em 4 formatos: JSON, CSV, HTML, Bookmarks
- **PWA + Offline** com cache local e fila de sincronização
- **Command Palette** (Ctrl+K) e 10+ atalhos de teclado
- **Dashboard de estatísticas** com gráficos interativos
- **Histórico de atividades** com log completo de ações
- **Segurança**: RLS, PKCE auth, rate limiting, API key rotation, CSP headers

## Tecnologias

- **Framework:** React 18 + TypeScript 5
- **Build:** Vite 7 (SWC)
- **UI:** Shadcn/UI + Radix UI + Tailwind CSS
- **Banco de Dados:** Supabase (PostgreSQL)
- **Validação:** Zod + React Hook Form
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
|---------|----------|
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
