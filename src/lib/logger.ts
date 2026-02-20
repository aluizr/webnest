/**
 * Sistema de logging centralizado para o WebNest.
 *
 * Registra erros, warnings e eventos em múltiplos destinos:
 * - Console (sempre, em dev)
 * - localStorage (últimos 100 erros, para diagnóstico)
 * - Sentry / LogRocket (quando configurados via env vars)
 *
 * Para integrar Sentry:
 *   1. npm install @sentry/react
 *   2. Definir VITE_SENTRY_DSN no .env
 *   3. O logger envia automaticamente
 *
 * Para integrar LogRocket:
 *   1. npm install logrocket
 *   2. Definir VITE_LOGROCKET_APP_ID no .env
 *   3. O logger envia automaticamente
 */

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  timestamp: string;
  url: string;
  userAgent: string;
}

const STORAGE_KEY = "webnest-error-log";
const MAX_STORED_ENTRIES = 100;

// ─── Sentry integration (lazy) ───
let sentryModule: any = null;
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

async function initSentry() {
  if (!SENTRY_DSN || sentryModule) return;
  try {
    // Dynamic import com variável para evitar que Vite/Rollup resolva no build
    const pkg = "@sentry/react";
    sentryModule = await import(/* @vite-ignore */ pkg);
    sentryModule.init({
      dsn: SENTRY_DSN,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.2,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
    });
  } catch {
    // Sentry not installed — that's fine
    sentryModule = null;
  }
}

// ─── LogRocket integration (lazy) ───
let logRocketModule: any = null;
const LOGROCKET_APP_ID = import.meta.env.VITE_LOGROCKET_APP_ID;

async function initLogRocket() {
  if (!LOGROCKET_APP_ID || logRocketModule) return;
  try {
    // Dynamic import com variável para evitar que Vite/Rollup resolva no build
    const pkg = "logrocket";
    const mod = await import(/* @vite-ignore */ pkg);
    logRocketModule = mod.default || mod;
    logRocketModule.init(LOGROCKET_APP_ID);
  } catch {
    // LogRocket not installed — that's fine
    logRocketModule = null;
  }
}

// ─── Initialize on load ───
if (SENTRY_DSN) initSentry();
if (LOGROCKET_APP_ID) initLogRocket();

// ─── Local storage persistence ───

function getStoredEntries(): LogEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function storeEntry(entry: LogEntry): void {
  try {
    const entries = getStoredEntries();
    entries.push(entry);
    // Manter apenas os últimos MAX_STORED_ENTRIES
    const trimmed = entries.slice(-MAX_STORED_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage full or unavailable
  }
}

// ─── Core Logger ───

function createEntry(
  level: LogLevel,
  message: string,
  error?: Error | null,
  context?: Record<string, unknown>
): LogEntry {
  return {
    id: crypto.randomUUID(),
    level,
    message,
    context,
    error: error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : undefined,
    timestamp: new Date().toISOString(),
    url: typeof window !== "undefined" ? window.location.href : "",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
  };
}

function sendToProviders(entry: LogEntry, error?: Error | null) {
  // Sentry
  if (sentryModule && (entry.level === "error" || entry.level === "fatal")) {
    if (error) {
      sentryModule.captureException(error, {
        extra: entry.context,
        tags: { level: entry.level },
      });
    } else {
      sentryModule.captureMessage(entry.message, {
        level: entry.level === "fatal" ? "fatal" : "error",
        extra: entry.context,
      });
    }
  }

  // LogRocket
  if (logRocketModule) {
    if (error && entry.level === "error") {
      logRocketModule.captureException(error, { extra: entry.context });
    }
  }
}

/**
 * Logger principal da aplicação.
 *
 * @example
 * logger.error("Falha ao salvar link", error, { linkId: "123" });
 * logger.warn("Rate limit próximo", null, { remaining: 2 });
 * logger.info("Link criado com sucesso", null, { url: "https://..." });
 */
export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    if (import.meta.env.DEV) {
      console.debug(`[DEBUG] ${message}`, context ?? "");
    }
  },

  info(message: string, context?: Record<string, unknown>) {
    if (import.meta.env.DEV) {
      console.info(`[INFO] ${message}`, context ?? "");
    }
    const entry = createEntry("info", message, null, context);
    storeEntry(entry);
  },

  warn(message: string, error?: Error | null, context?: Record<string, unknown>) {
    console.warn(`[WARN] ${message}`, error ?? "", context ?? "");
    const entry = createEntry("warn", message, error, context);
    storeEntry(entry);
    sendToProviders(entry, error);
  },

  error(message: string, error?: Error | null, context?: Record<string, unknown>) {
    console.error(`[ERROR] ${message}`, error ?? "", context ?? "");
    const entry = createEntry("error", message, error, context);
    storeEntry(entry);
    sendToProviders(entry, error);
  },

  fatal(message: string, error?: Error | null, context?: Record<string, unknown>) {
    console.error(`[FATAL] ${message}`, error ?? "", context ?? "");
    const entry = createEntry("fatal", message, error, context);
    storeEntry(entry);
    sendToProviders(entry, error);
  },
};

/**
 * Obter todos os logs armazenados localmente.
 * Útil para diagnóstico e suporte.
 */
export function getStoredLogs(): LogEntry[] {
  return getStoredEntries();
}

/**
 * Limpar logs armazenados.
 */
export function clearStoredLogs(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Exportar logs como JSON para enviar ao suporte.
 */
export function exportLogs(): string {
  const entries = getStoredEntries();
  return JSON.stringify(entries, null, 2);
}

/**
 * Identificar o usuário nos providers de logging.
 * Chamado após login.
 */
export function identifyUser(userId: string, email?: string): void {
  if (sentryModule) {
    sentryModule.setUser({ id: userId, email });
  }
  if (logRocketModule) {
    logRocketModule.identify(userId, { email });
  }
  logger.info("Usuário identificado", { userId });
}

/**
 * Limpar identidade do usuário.
 * Chamado após logout.
 */
export function clearUserIdentity(): void {
  if (sentryModule) {
    sentryModule.setUser(null);
  }
  logger.info("Identidade do usuário limpa");
}

// ─── Global error handlers ───

if (typeof window !== "undefined") {
  // Capturar erros não-tratados
  window.addEventListener("error", (event) => {
    logger.fatal("Unhandled error", event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  // Capturar promises rejeitadas sem handler
  window.addEventListener("unhandledrejection", (event) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    logger.fatal("Unhandled promise rejection", error);
  });
}
