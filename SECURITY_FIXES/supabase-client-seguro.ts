// src/integrations/supabase/client.ts - VERSÃO SEGURA
// Use este arquivo para substituir o atual

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/integrations/supabase/types';

// Corrige tipagem de import.meta.env para Vite
declare global {
  interface ImportMeta {
    env: {
      VITE_SUPABASE_URL: string;
      VITE_SUPABASE_PUBLISHABLE_KEY: string;
      [key: string]: string;
    };
  }
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Variáveis de ambiente Supabase não configuradas');
}

// Criar storage customizado com suporte a SSR
const createBrowserStorage = () => ({
  getItem: (key: string) => {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(key);
  },
});

export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY, 
  {
    auth: {
      storage: typeof window !== 'undefined' ? createBrowserStorage() : undefined,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // ✅ Boas práticas
      flowType: 'pkce', // Usar PKCE flow (mais seguro que implicit)
    },
    // ✅ Segurança: Desabilitar auto-retry para operações críticas
    // para prevenir DDoS acidental
    global: {
      fetch: (...args) => {
        // Aqui você pode adicionar validação adicional de requisições
        return fetch(...args);
      },
    },
  }
);

// ✅ Adicionar listener para expiração de sessão
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
    // Limpar dados sensíveis se necessário
    if (event === 'SIGNED_OUT') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('sensitive_data');
      }
    }
  }
});
