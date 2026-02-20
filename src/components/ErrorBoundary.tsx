import { Component, type ErrorInfo, type ReactNode } from "react";
import { logger } from "@/lib/logger";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Componente de fallback customizado */
  fallback?: ReactNode | ((props: { error: Error; reset: () => void }) => ReactNode);
  /** Callback quando um erro é capturado */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary genérico para capturar erros de renderização em React.
 *
 * Envia erros automaticamente para o logger (console + localStorage + Sentry).
 *
 * @example
 * // Com fallback padrão
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 *
 * // Com fallback customizado
 * <ErrorBoundary fallback={({ error, reset }) => (
 *   <div>
 *     <p>Erro: {error.message}</p>
 *     <button onClick={reset}>Tentar novamente</button>
 *   </div>
 * )}>
 *   <Component />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log para o sistema de logging centralizado
    logger.fatal("React Error Boundary capturou erro", error, {
      componentStack: errorInfo.componentStack ?? undefined,
    });

    // Callback customizado
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Fallback customizado (função)
      if (typeof this.props.fallback === "function") {
        return this.props.fallback({
          error: this.state.error,
          reset: this.handleReset,
        });
      }

      // Fallback customizado (elemento)
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Fallback padrão
      return <DefaultErrorFallback error={this.state.error} reset={this.handleReset} />;
    }

    return this.props.children;
  }
}

// ─── Fallback padrão ───

interface DefaultErrorFallbackProps {
  error: Error;
  reset: () => void;
}

function DefaultErrorFallback({ error, reset }: DefaultErrorFallbackProps) {
  const isDev = import.meta.env.DEV;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="mx-auto max-w-md space-y-6 text-center">
        {/* Ícone de erro */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <svg
            className="h-8 w-8 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Algo deu errado</h1>
          <p className="text-sm text-muted-foreground">
            Ocorreu um erro inesperado. Tente recarregar a página ou clique no botão abaixo.
          </p>
        </div>

        {/* Detalhes do erro (somente em dev) */}
        {isDev && (
          <div className="rounded-lg border bg-muted/50 p-4 text-left">
            <p className="mb-1 text-xs font-medium text-destructive">{error.name}</p>
            <p className="text-xs text-muted-foreground">{error.message}</p>
            {error.stack && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                  Stack trace
                </summary>
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[10px] text-muted-foreground">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Ações */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Tentar novamente
          </button>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Recarregar página
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Se o problema persistir, limpe o cache do navegador ou entre em contato com o suporte.
        </p>
      </div>
    </div>
  );
}
