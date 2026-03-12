# 🐳 Guia de Publicação com Docker

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop) instalado
- Ou Docker CLI + Docker Daemon

## 📦 Estrutura de Arquivos Docker

├── Dockerfile              # Build production com Node.js serve
├── Dockerfile.dev          # Build com watch/hot-reload para dev
├── Dockerfile.nginx        # Build production otimizado com Nginx
├── docker-compose.yml      # Production (Node.js)
├── docker-compose.dev.yml  # Desenvolvimento
├── docker-compose.all.yml  # Todos os ambientes
├── nginx.conf              # Configuração Nginx
└── .dockerignore           # Arquivos ignorados no build

├── Dockerfile              # Build production com Node.js serve
├── Dockerfile.dev          # Build com watch/hot-reload para dev
├── Dockerfile.nginx        # Build production otimizado com Nginx
├── docker-compose.yml      # Production (Node.js)
├── docker-compose.dev.yml  # Desenvolvimento
├── docker-compose.all.yml  # Todos os ambientes
├── nginx.conf              # Configuração Nginx
└── .dockerignore           # Arquivos ignorados no build

├── Dockerfile              # Build production com Node.js serve
├── Dockerfile.dev          # Build com watch/hot-reload para dev
├── Dockerfile.nginx        # Build production otimizado com Nginx
├── docker-compose.yml      # Production (Node.js)
├── docker-compose.dev.yml  # Desenvolvimento
├── docker-compose.all.yml  # Todos os ambientes
├── nginx.conf              # Configuração Nginx
└── .dockerignore           # Arquivos ignorados no build

├── Dockerfile              # Build production com Node.js serve
├── Dockerfile.dev          # Build com watch/hot-reload para dev
├── Dockerfile.nginx        # Build production otimizado com Nginx
├── docker-compose.yml      # Production (Node.js)
├── docker-compose.dev.yml  # Desenvolvimento
├── docker-compose.all.yml  # Todos os ambientes
├── nginx.conf              # Configuração Nginx
└── .dockerignore           # Arquivos ignorados no build

```bash
├── Dockerfile              # Build production com Node.js serve
├── Dockerfile.dev          # Build com watch/hot-reload para dev
├── Dockerfile.nginx        # Build production otimizado com Nginx
├── docker-compose.yml      # Production (Node.js)
├── docker-compose.dev.yml  # Desenvolvimento
├── docker-compose.all.yml  # Todos os ambientes
├── nginx.conf              # Configuração Nginx
└── .dockerignore           # Arquivos ignorados no build
```

## 🚀 Quick Start

### 1. **Desenvolvimento Local com Docker**

```bash
# Iniciar com hot-reload
docker-compose -f docker-compose.dev.yml up

# Acessar em http://localhost:5173
```

### 2. **Build para Production (Node.js serve)**

```bash
# Construir imagem
docker build -t webnest:latest .

# Executar container
docker run -p 3000:3000 webnest:latest

# Acessar em http://localhost:3000
```

### 3. **Build para Production (Nginx - Recomendado)**

```bash
# Construir imagem Nginx
docker build -f Dockerfile.nginx -t webnest:nginx .

# Executar container
docker run -p 80:80 webnest:nginx

# Acessar em http://localhost
```

### 4. **Docker Compose (Production)**

```bash
# Iniciar serviço
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar serviço
docker-compose down
```

## 📊 Comparação de Dockerfiles

### **Dockerfile (Node.js serve)**

- ✅ Simples e direto
- ✅ ~640MB de imagem
- ✅ Bom para desenvolvimento
- ❌ Menos eficiente para production

### **Dockerfile.nginx (Recomendado)**

- ✅ Otimizado para production
- ✅ ~60MB de imagem (muito menor!)
- ✅ Melhor performance
- ✅ Compressão gzip integrada
- ✅ Cache de recursos estáticos
- ✅ SPA routing configurado
- ✅ Health checks
- 🔧 Requer arquivo nginx.conf

## 🔧 Configurações Nginx

O arquivo `nginx.conf` inclui:

- **Compressão Gzip**: Reduz tamanho dos arquivos
- **Cache headers**: Otimiza carregamento
- **SPA Routing**: Redireciona 404 para index.html
- **Health check endpoint**: `/health` para monitoramento
- **Security headers**: Proteção básica
- **Max upload size**: 10MB

## 📝 Variáveis de Ambiente

### Production (docker-compose.yml)

```yaml
VITE_API_URL=http://localhost:3000
```

### Desenvolvimento (docker-compose.dev.yml)

```yaml
VITE_API_URL=http://localhost:5173
```

## 🎯 Casos de Uso

### Desenvolvimento Local

```bash
docker-compose -f docker-compose.dev.yml up
```

- Hot-reload automático
- Acesso a /app/node_modules
- Debug facilitado

### Staging/QA

```bash
docker build -f Dockerfile.nginx -t registry.example.com/webnest:staging .
docker push registry.example.com/webnest:staging
```

### Production em Servidor

```bash
# Pull imagem
docker pull registry.example.com/webnest:latest

# Executar com restart policy
docker run -d \
  --restart unless-stopped \
  -p 80:80 \
  --name webnest-prod \
  registry.example.com/webnest:latest
```

## 🔍 Verificação e Debug

### Listar containers

```bash
docker ps -a
```

### Ver logs

```bash
docker logs -f webnest
```

### Acessar container

```bash
docker exec -it webnest sh
```

### Verificar health

```bash
curl http://localhost/health
# ou http://localhost:3000/health (Node.js)
```

## 📤 Publicar em Registry

### Docker Hub

```bash
# Tag
docker tag webnest:latest seu-usuario/webnest:latest

# Login
docker login

# Push
docker push seu-usuario/webnest:latest
```

### Registries Privados

```bash
docker tag webnest:latest registry.example.com/webnest:latest
docker login registry.example.com
docker push registry.example.com/webnest:latest
```

## ☁️ Plataformas de Deploy Recomendadas

### 1. **Railway.app** (Recomendado - Free + Fácil)

- Deploy automático do GitHub
- Suporte nativo a Docker
- Domínio customizado grátis
- Environment variables UI

### 2. **Render.com**

- Deploy automático
- SSL grátis
- PostgreSQL gratuitamente

### 3. **Heroku** (Descontinuado plan free - 2022)

- Ainda funciona mas pago
- Setup antigo mas confiável

### 4. **AWS ECS**

- Escalável
- Mais complexo
- Melhor para aplicações grandes

### 5. **DigitalOcean App Platform**

- Deploy simples
- Droplets customizáveis
- Bom custo-benefício

### 6. **Vercel** (Para Static/Frontend)

- Perfeito para SPA React
- Deploy automático
- Gratuito com opções premium

## 🔐 Boas Práticas

### Multi-stage Builds

✅ Já implementado - reduz tamanho da imagem em ~90%

### Image Size

- Node.js serve: ~640MB
- Nginx: ~60MB (10x menor!)

### Security

- ✅ Alpine Linux (menor attack surface)
- ✅ Non-root user (Nginx roda como nginx)
- ✅ Health checks implementados
- ⚠️ TODO: Adicionar usuário non-root para Node.js

### Performance

- ✅ Gzip compression
- ✅ Cache headers
- ✅ Image optimization
- ✅ Health checks

## 📋 Checklist para Deploy

- [ ] Testar build localmente: `docker build -f Dockerfile.nginx .`
- [ ] Verificar health endpoint funciona
- [ ] Configurar variáveis de ambiente
- [ ] Testar container rodando em outro port
- [ ] Configurar volumes (se necessário)
- [ ] Documentar environment variables
- [ ] Setup de logging/monitoring
- [ ] Testar rollback procedures
- [ ] Configurar auto-restart

## 🐛 Troubleshooting

### Build falha - "Cannot find module"

```bash
# Limpar cache
docker build --no-cache -f Dockerfile.nginx .
```

### Port já em uso

```bash
# Mudar port
docker run -p 8080:80 webnest:nginx
```

### Container não inicia

```bash
# Ver logs
docker logs nome-container
```

### Arquivo não encontrado em container

```bash
# Verificar path
docker exec nome-container ls -la /usr/share/nginx/html/
```

## 📚 Recursos Adicionais

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Nginx Docker Hub](https://hub.docker.com/_/nginx)
- [Node Alpine Docker Hub](https://hub.docker.com/_/node)
- [Best Practices for Node.js Docker](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

---

**Dúvidas?** Posso ajudar com:

- Deploy em plataforma específica
- Otimização de performance
- CI/CD pipelines
- Environment-specific configs
