# Build stage - Compila o app React
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package.json bun.lockb ./

# Instalar dependências com npm
RUN npm ci --no-progress --no-fund

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Production stage - Serve a aplicação compilada
FROM node:20-alpine

WORKDIR /app

# Instalar serve para servir arquivos estáticos
RUN npm install -g serve

# Copiar arquivo build do stage anterior
COPY --from=builder /app/dist ./dist

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Comando para iniciar a aplicação
CMD ["serve", "-s", "dist", "-l", "3000"]
