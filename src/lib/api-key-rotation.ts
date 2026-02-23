/**
 * API Key Rotation — WebNest
 *
 * Suporte a rotação segura de chaves Supabase (anon key).
 *
 * Como usar:
 * 1. Gere uma nova anon key no Supabase Dashboard → Settings → API
 * 2. Coloque a NOVA chave em VITE_SUPABASE_PUBLISHABLE_KEY
 * 3. Coloque a chave ANTIGA em VITE_SUPABASE_FALLBACK_KEY
 * 4. Faça deploy — ambas as chaves funcionam durante a transição
 * 5. Após confirmar que todos os clientes atualizaram, remova VITE_SUPABASE_FALLBACK_KEY
 *
 * O sistema:
 * - Tenta a chave primária primeiro
 * - Se receber 401/403 (chave inválida), tenta a fallback
 * - Loga warnings quando a fallback é usada (indica rotação em progresso)
 * - Armazena a chave ativa em sessionStorage para evitar retry desnecessário
 */

import { logger } from "./logger";

const ACTIVE_KEY_STORAGE = "webnest:active-api-key";

export interface ApiKeyConfig {
  primaryKey: string;
  fallbackKey: string | null;
  supabaseUrl: string;
}

/**
 * Retorna a configuração de chaves do ambiente.
 */
export function getApiKeyConfig(): ApiKeyConfig {
  const primaryKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  const fallbackKey = import.meta.env.VITE_SUPABASE_FALLBACK_KEY || null;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";

  return { primaryKey, fallbackKey, supabaseUrl };
}

/**
 * Determina qual chave usar (primária ou fallback).
 * Verifica sessionStorage para evitar retestar uma chave já rejeitada na sessão.
 */
export function getActiveKey(config: ApiKeyConfig): string {
  const { primaryKey, fallbackKey } = config;

  // Se não tem fallback, usa a primária direto
  if (!fallbackKey) return primaryKey;

  // Checa se já descobrimos qual chave funciona nesta sessão
  if (typeof window !== "undefined") {
    const cached = sessionStorage.getItem(ACTIVE_KEY_STORAGE);
    if (cached === "primary") return primaryKey;
    if (cached === "fallback" && fallbackKey) return fallbackKey;
  }

  // Default: tenta primária primeiro
  return primaryKey;
}

/**
 * Valida uma chave fazendo uma request leve ao Supabase.
 * Retorna true se a chave é aceita, false se 401/403.
 */
export async function validateApiKey(
  supabaseUrl: string,
  apiKey: string
): Promise<boolean> {
  try {
    // Health check endpoint — não precisa de auth, mas valida o apikey header
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: "HEAD",
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
    });

    // 401 ou 403 = chave inválida
    if (response.status === 401 || response.status === 403) {
      return false;
    }

    return true;
  } catch {
    // Erro de rede — assume chave válida (problema é outro)
    return true;
  }
}

/**
 * Testa a chave primária e fallback. Retorna a que funciona.
 * Armazena resultado em sessionStorage para a sessão.
 */
export async function resolveWorkingKey(
  config: ApiKeyConfig
): Promise<{ key: string; source: "primary" | "fallback" }> {
  const { primaryKey, fallbackKey, supabaseUrl } = config;

  // Tenta primária
  const primaryValid = await validateApiKey(supabaseUrl, primaryKey);

  if (primaryValid) {
    cacheActiveKey("primary");
    return { key: primaryKey, source: "primary" };
  }

  logger.warn("Chave primária Supabase rejeitada (401/403)");

  // Tenta fallback
  if (fallbackKey) {
    const fallbackValid = await validateApiKey(supabaseUrl, fallbackKey);

    if (fallbackValid) {
      logger.warn(
        "Usando chave fallback do Supabase — rotação em progresso. " +
        "Ação sugerida: Mova a chave válida para VITE_SUPABASE_PUBLISHABLE_KEY e remova VITE_SUPABASE_FALLBACK_KEY."
      );
      cacheActiveKey("fallback");
      return { key: fallbackKey, source: "fallback" };
    }

    logger.error("Ambas as chaves Supabase foram rejeitadas!");
  }

  // Nenhuma funciona — retorna primária e deixa o erro acontecer naturalmente
  return { key: primaryKey, source: "primary" };
}

/**
 * Detecta se uma resposta fetch indica chave inválida.
 */
export function isKeyRejection(status: number): boolean {
  return status === 401 || status === 403;
}

/**
 * Cria um fetch wrapper que detecta rejeição de chave e tenta fallback.
 */
export function createRotationAwareFetch(
  config: ApiKeyConfig
): typeof globalThis.fetch {
  let usingFallback = false;

  return async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const response = await fetch(input, init);

    // Se não é rejeição de chave ou já estamos no fallback, retorna direto
    if (!isKeyRejection(response.status) || usingFallback || !config.fallbackKey) {
      return response;
    }

    // Chave primária rejeitada — tenta com fallback
    logger.warn(
      `Request rejeitada — tentando chave fallback. URL: ${
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.href
          : (input as Request).url
      }, status: ${response.status}`
    );

    // Refaz a request com a chave fallback nos headers
    const newHeaders = new Headers(init?.headers);
    newHeaders.set("apikey", config.fallbackKey);
    newHeaders.set("Authorization", `Bearer ${config.fallbackKey}`);

    const retryResponse = await fetch(input, {
      ...init,
      headers: newHeaders,
    });

    if (!isKeyRejection(retryResponse.status)) {
      // Fallback funcionou — cache e loga
      usingFallback = true;
      cacheActiveKey("fallback");
      logger.warn("Fallback key ativa — atualize VITE_SUPABASE_PUBLISHABLE_KEY");
    }

    return retryResponse;
  };
}

/**
 * Armazena qual chave está ativa em sessionStorage.
 */
function cacheActiveKey(source: "primary" | "fallback"): void {
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(ACTIVE_KEY_STORAGE, source);
    } catch {
      // sessionStorage indisponível — ignora
    }
  }
}

/**
 * Limpa o cache de chave ativa (útil ao fazer logout ou reset).
 */
export function clearKeyCache(): void {
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(ACTIVE_KEY_STORAGE);
    } catch {
      // ignora
    }
  }
}

/**
 * Informações de diagnóstico sobre o estado da rotação.
 */
export function getRotationStatus(): {
  hasFallback: boolean;
  activeSource: string | null;
  rotationInProgress: boolean;
} {
  const config = getApiKeyConfig();
  const hasFallback = !!config.fallbackKey;
  const activeSource =
    typeof window !== "undefined"
      ? sessionStorage.getItem(ACTIVE_KEY_STORAGE)
      : null;

  return {
    hasFallback,
    activeSource,
    rotationInProgress: hasFallback && activeSource === "fallback",
  };
}
