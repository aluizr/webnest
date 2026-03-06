import { ShieldCheck, ShieldAlert, Loader2, X, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { LinkItem } from "@/types/link";
import type { LinkStatus } from "@/hooks/use-link-checker";
import { FaviconWithFallback } from "@/components/FaviconWithFallback";
import { COMPACT_BADGE_CLASS, TEXT_XS_CLASS } from "@/lib/utils";

interface LinkCheckerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  links: LinkItem[];
  results: Record<string, { id: string; status: LinkStatus; statusCode?: number; checkedAt: string }>;
  checking: boolean;
  progress: { checked: number; total: number };
  onCheckAll: () => void;
  onCancel: () => void;
  onClear: () => void;
}

const statusConfig: Record<LinkStatus, { label: string; color: string; icon: React.ElementType }> = {
  unknown: { label: "Não verificado", color: "text-muted-foreground", icon: ShieldCheck },
  checking: { label: "Verificando...", color: "text-blue-500", icon: Loader2 },
  ok: { label: "OK", color: "text-green-600", icon: ShieldCheck },
  broken: { label: "Quebrado", color: "text-destructive", icon: ShieldAlert },
  error: { label: "Erro", color: "text-amber-500", icon: ShieldAlert },
};

export function LinkCheckerPanel({
  isOpen,
  onClose,
  links,
  results,
  checking,
  progress,
  onCheckAll,
  onCancel,
  onClear,
}: LinkCheckerPanelProps) {
  const brokenLinks = links.filter((l) => results[l.id]?.status === "broken");
  const okLinks = links.filter((l) => results[l.id]?.status === "ok");
  const checkedCount = Object.values(results).filter((r) => r.status === "ok" || r.status === "broken" || r.status === "error").length;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Verificador de Links
          </SheetTitle>
          <SheetDescription>
            Verifique se seus links salvos ainda estão ativos.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold">{links.length}</p>
              <p className={`${TEXT_XS_CLASS} text-muted-foreground`}>Total</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{okLinks.length}</p>
              <p className={`${TEXT_XS_CLASS} text-muted-foreground`}>Ativos</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-destructive">{brokenLinks.length}</p>
              <p className={`${TEXT_XS_CLASS} text-muted-foreground`}>Quebrados</p>
            </div>
          </div>

          {/* Progress */}
          {checking && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando...
                </span>
                <span className="text-muted-foreground">
                  {progress.checked} / {progress.total}
                </span>
              </div>
              <Progress value={(progress.checked / Math.max(progress.total, 1)) * 100} className="h-2" />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {checking ? (
              <Button variant="outline" onClick={onCancel} className="flex-1">
                <X className="h-4 w-4 mr-1.5" />
                Cancelar
              </Button>
            ) : (
              <Button onClick={onCheckAll} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-1.5" />
                {checkedCount > 0 ? "Reverificar tudo" : "Verificar todos os links"}
              </Button>
            )}
            {checkedCount > 0 && !checking && (
              <Button variant="outline" onClick={onClear}>
                Limpar
              </Button>
            )}
          </div>

          {/* Broken links list */}
          {brokenLinks.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-destructive flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4" />
                Links quebrados ({brokenLinks.length})
              </h3>
              {brokenLinks.map((link) => {
                const result = results[link.id];
                return (
                  <div
                    key={link.id}
                    className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3"
                  >
                    <FaviconWithFallback url={link.url} favicon={link.favicon} size={20} className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{link.title || link.url}</p>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${TEXT_XS_CLASS} text-muted-foreground hover:text-primary truncate flex items-center gap-1`}
                      >
                        {link.url}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                      {result?.statusCode && (
                        <Badge variant="outline" className={`${COMPACT_BADGE_CLASS} mt-1`}>
                          HTTP {result.statusCode}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* All checked and no broken */}
          {checkedCount > 0 && brokenLinks.length === 0 && !checking && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ShieldCheck className="h-10 w-10 text-green-600 mb-2" />
              <p className="text-sm font-medium text-green-600">Todos os links estão ativos!</p>
              <p className={`${TEXT_XS_CLASS} text-muted-foreground mt-1`}>{okLinks.length} links verificados</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
