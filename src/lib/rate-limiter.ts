/**
 * Rate Limiter client-side para operações no Supabase.
 * 
 * Usa sliding window para limitar chamadas por tipo de operação.
 * Isso previne:
 * - Spam de criação de links
 * - Flood de updates/deletes
 * - Abuso de autenticação (brute force)
 */

interface RateLimitConfig {
  /** Máximo de operações permitidas na janela */
  maxRequests: number;
  /** Duração da janela em milissegundos */
  windowMs: number;
}

interface RateLimitEntry {
  timestamps: number[];
}

// Configurações por tipo de operação
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Links
  "link:create":    { maxRequests: 10,  windowMs: 60_000 },     // 10/min
  "link:update":    { maxRequests: 30,  windowMs: 60_000 },     // 30/min
  "link:delete":    { maxRequests: 20,  windowMs: 60_000 },     // 20/min
  "link:favorite":  { maxRequests: 40,  windowMs: 60_000 },     // 40/min
  "link:reorder":   { maxRequests: 15,  windowMs: 60_000 },     // 15/min

  // Categorias
  "category:create": { maxRequests: 10, windowMs: 60_000 },     // 10/min
  "category:delete": { maxRequests: 10, windowMs: 60_000 },     // 10/min
  "category:rename": { maxRequests: 20, windowMs: 60_000 },     // 20/min

  // Auth
  "auth:signin":     { maxRequests: 5,  windowMs: 300_000 },    // 5 por 5 min
  "auth:signup":     { maxRequests: 3,  windowMs: 600_000 },    // 3 por 10 min

  // Genérico
  "api:read":        { maxRequests: 60, windowMs: 60_000 },     // 60/min
};

// Store em memória (resetado ao recarregar a página)
const store = new Map<string, RateLimitEntry>();

/**
 * Verifica se a operação pode ser executada dentro dos limites.
 * 
 * @param operation - Tipo de operação (ex: "link:create")
 * @returns `true` se permitido, `false` se rate-limited
 */
export function checkRateLimit(operation: string): boolean {
  const config = RATE_LIMITS[operation];
  if (!config) return true; // Operação sem limite definido

  const now = Date.now();
  const entry = store.get(operation) || { timestamps: [] };

  // Remover timestamps fora da janela
  entry.timestamps = entry.timestamps.filter(
    (ts) => now - ts < config.windowMs
  );

  if (entry.timestamps.length >= config.maxRequests) {
    return false; // Rate limit atingido
  }

  // Registrar nova operação
  entry.timestamps.push(now);
  store.set(operation, entry);
  return true;
}

/**
 * Verifica rate limit e lança erro se excedido.
 * Útil para usar com try/catch.
 */
export function enforceRateLimit(operation: string): void {
  if (!checkRateLimit(operation)) {
    const config = RATE_LIMITS[operation];
    const windowSec = config ? Math.round(config.windowMs / 1000) : 60;
    throw new RateLimitError(
      `Muitas requisições. Aguarde ${windowSec}s antes de tentar novamente.`,
      operation
    );
  }
}

/**
 * Retorna informações sobre o rate limit atual.
 */
export function getRateLimitInfo(operation: string): {
  remaining: number;
  total: number;
  resetInMs: number;
} {
  const config = RATE_LIMITS[operation];
  if (!config) return { remaining: Infinity, total: Infinity, resetInMs: 0 };

  const now = Date.now();
  const entry = store.get(operation);
  
  if (!entry || entry.timestamps.length === 0) {
    return { remaining: config.maxRequests, total: config.maxRequests, resetInMs: 0 };
  }

  const validTimestamps = entry.timestamps.filter(
    (ts) => now - ts < config.windowMs
  );

  const oldest = validTimestamps[0];
  const resetInMs = oldest ? config.windowMs - (now - oldest) : 0;

  return {
    remaining: Math.max(0, config.maxRequests - validTimestamps.length),
    total: config.maxRequests,
    resetInMs: Math.max(0, resetInMs),
  };
}

/**
 * Erro customizado para rate limiting.
 */
export class RateLimitError extends Error {
  public readonly operation: string;

  constructor(message: string, operation: string) {
    super(message);
    this.name = "RateLimitError";
    this.operation = operation;
  }
}

/**
 * Limpa os dados de rate limit de uma operação específica.
 * Útil para testes.
 */
export function resetRateLimit(operation: string): void {
  store.delete(operation);
}

/**
 * Limpa todos os dados de rate limit.
 */
export function resetAllRateLimits(): void {
  store.clear();
}
