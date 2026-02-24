# 📋 Guia Prático de Implementação das Correções de Segurança

## 🚨 PRIORIDADE IMEDIATA (HOJE - 24h)

### Passo 1: Revogar Chaves Comprometidas

1. Abra <https://app.supabase.com> e entre na sua conta
2. Vá para seu projeto `slzspaijayxtyjmrogcm`
3. Settings → API → Anon Public Key
4. **REVOKE** (revogar) a chave atual
5. Gere uma **NOVA chave**
6. Copie a nova chave

### Passo 2: Remover .env do Histórico Git

```bash
# Se você ainda NÃO fez push para um repositório remoto:
git rm --cached .env
git add .gitignore
git commit -m "Remove exposed .env file and add to gitignore"

# Se JÁ fez push (necessário histórico limpo):
# Opção 1: Usar BFG Repo-Cleaner (recomendado)
# Dowload: https://rtyley.github.io/bfg-repo-cleaner/
bfg --delete-files .env .
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# Opção 2: Usar git filter-branch (mais lento)
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch .env" --prune-empty --tag-name-filter cat -- --all
```

### Passo 3: Atualizar Arquivos de Configuração

```bash
# 1. Substituir .gitignore
cp .gitignore.corrected .gitignore

# 2. Criar .env.example (já criado)
# (Não fazer commit do .env real)

# 3. Atualizar .env com novas credenciais
# Editar .env com os novos valores do Supabase
VITE_SUPABASE_PROJECT_ID="slzspaijayxtyjmrogcm"
VITE_SUPABASE_PUBLISHABLE_KEY="[NOVA_CHAVE_AQUI]"
VITE_SUPABASE_URL="https://slzspaijayxtyjmrogcm.supabase.co"
```

### Passo 4: Verificar RLS no Banco de Dados

```bash
# 1. Abra Supabase Dashboard → SQL Editor
# 2. Execute esta query para verificar políticas:
SELECT * FROM pg_policies WHERE schemaname = 'public';

# 3. Procure por "Allow all access" - se existir, significa que a
#    segunda migração NÃO foi aplicada
# 4. Se necessário, execute:
# (Copie e execute SECURITY_FIXES/migration-security-improvements.sql 
#  no Supabase SQL Editor)
```

---

## ✅ FASE 1: SEGURANÇA BÁSICA (Próximos 3 dias)

### Implementação 1: Validação de URLs Seguras

```bash
# 1. Copie o novo validation.ts
cp SECURITY_FIXES/validation-segura.ts src/lib/validation.ts

# 2. Teste com:
npm run test
```

**Mudanças no código:**

- ✅ Whitelist de protocolos (http, https, ftp, mailto)
- ✅ Blacklist de padrões maliciosos (javascript:, data:, etc)
- ✅ Validação de estrutura com refine

---

### Implementação 2: Client Supabase Seguro

```bash
# 1. Copie o novo client.ts
cp SECURITY_FIXES/supabase-client-seguro.ts src/integrations/supabase/client.ts

# 2. Reinicie o servidor de dev
npm run dev
```

**Mudanças:**

- ✅ PKCE flow (mais seguro)
- ✅ SSR-safe storage
- ✅ Error handling

---

### Implementação 3: Content Security Policy

```bash
# Opção A: META tag (rápida, em desenvolvimento)
# Edite index.html com SECURITY_FIXES/index-securo.html

# Opção B: Header HTTP (melhor, em produção)
# Se usar Vercel, Netlify ou similar:
# Adicionar ao seu arquivo de configuração:

# vercel.json ou netlify.toml
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://slzspaijayxtyjmrogcm.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests"
        }
      ]
    }
  ]
}
```

---

### Implementação 4: Import Handler Seguro

```bash
# Edite src/pages/Index.tsx
# Substitua a função handleImport pela versão de SECURITY_FIXES/import-handler-seguro.tsx

# Recursos adicionados:
# ✅ Limite de tamanho (5MB)
# ✅ Limite de quantidade (1000 links)
# ✅ Validação individual de cada link
# ✅ Feedback detalhado de erros
```

---

### Implementação 5: Vite Config com Headers

```bash
# Copie a versão segura
cp SECURITY_FIXES/vite-config-seguro.ts vite.config.ts

# Reconfigure env
# Adicione ao arquivo .env:
VITE_APP_URL=http://localhost:8080
```

---

## 🔒 FASE 2: SEGURANÇA AVANÇADA (Próxima semana)

### Implementação 6: Favicon Seguro

```bash
# Edite src/components/LinkCard.tsx
# Substitua as linhas de favicon pela versão em SECURITY_FIXES/favicon-seguro.tsx

# Opção preferida:
const faviconUrl = `https://icon.horse/icon/${hostname}?size=32`;

# Alternativa mais privada: auto-hosted ou backend
```

---

### Implementação 7: Melhorias de Banco de Dados

```bash
# 1. Abra Supabase Dashboard → SQL Editor
# 2. Copie todo o conteúdo de:
#    SECURITY_FIXES/migration-security-improvements.sql
# 3. Execute no SQL Editor

# Este script adiciona:
# ✅ Índices para performance
# ✅ Auditoria (audit_log)
# ✅ Soft delete
# ✅ Cleanup de dados antigos
# ✅ Realtime notifications
```

---

## 🧪 TESTES DE SEGURANÇA

### Teste 1: XSS - URL Maliciosa

```typescript
// Tente adicionar este link:
URL: javascript:alert('XSS')
// Resultado esperado: ❌ REJEITADO
// Mensagem: "URL com protocolo inválido"
```

### Teste 2: Arquivo Grande

```typescript
// Tente importar um arquivo > 5MB
// Resultado esperado: ❌ REJEITADO
// Mensagem: "Arquivo muito grande"
```

### Teste 3: RLS - Isolamento de Dados

```typescript
// 1. Faça login com Usuário A
// 2. Adicione um link
// 3. Abra DevTools → Network
// 4. Faça login com Usuário B em outra aba
// 5. Verificar que Usuário B NÃO vê links de Usuário A
```

### Teste 4: CSP

```typescript
// DevTools → Console
// Se aparecer erro: "Refused to load the script..."
// ✅ CSP está funcionando
```

---

## 📦 Deploy Seguro

### Antes de Deploy

```bash
# 1. Certificar que .env não está no repo
git status
# Não deve aparecer .env

# 2. Verificar que .gitignore está correto
cat .gitignore | grep -E "(.env|\.env)"
# Deve aparecer .env

# 3. Audit de dependências
npm audit
# Corrigir vulnerabilidades críticas

# 4. Build de produção
npm run build
# Verificar se roda sem erros

# 5. Verificar tamanho
ls -lh dist/
# Ideal < 500KB gzipped
```

### Deploy em Vercel/Netlify

```bash
# 1. Adicionar environment variables:
# Settings → Environment Variables
VITE_SUPABASE_PROJECT_ID=seu_id
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave
VITE_SUPABASE_URL=sua_url

# 2. Redeploy

# 3. Verificar headers de segurança:
curl -I https://seu-app.vercel.app
# Deve aparecer:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Strict-Transport-Security: max-age=...
```

---

## 🔍 Checklist Final

### ✅ Antes de Ir Para Produção

- [ ] Chaves Supabase revogadas e novas geradas
- [ ] `.env` removido do histórico git
- [ ] `.gitignore` atualizado
- [ ] Validação de URLs implementada
- [ ] CSP headers adicionados
- [ ] RLS verificado no banco de dados
- [ ] Import handler com limitações implementado
- [ ] Testes de segurança passando
- [ ] `npm audit` sem críticos
- [ ] Build de produção testado
- [ ] Environment variables configuradas no hosting
- [ ] HTTPS habilitado
- [ ] Backup do banco de dados configurado

---

## 📚 Recursos Adicionais

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [Supabase Security Docs](https://supabase.com/docs/guides/auth)
- [MDN Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [Vite Security](https://vitejs.dev/guide/env-and-mode.html)

---

## ❓ Dúvidas Comuns

**P: Por que revogr chaves se o código é open source?**  
R: Mesmo em open source, você deve:

- Usar chaves separadas para dev/prod
- Rotacionar chaves regularmente
- Monitorar acessos anormais

**P: Posso manter localStorage para sessões?**  
R: É uma prática comum, mas:

- Use httpOnly cookies se possível
- Implemente proteção XSS robusta
- Monitore alterações de tokens

**P: CSP vai quebrar minha app?**  
R: Pode. Por isso:

- Comece com `Content-Security-Policy-Report-Only`
- Veja os erros no console
- Ajuste a política gradualmente

**P: Quanto tempo leva para implementar tudo?**  
R:

- Fase 1 (crítica): 2-4 horas
- Fase 2 (avançada): 4-8 horas
- Testes: 2-4 horas

---

**Última atualização:** 15 de Fevereiro de 2026
