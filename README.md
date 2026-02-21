# WebNest — Gerenciador de Links

Organize seus links favoritos com estilo e segurança.

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
