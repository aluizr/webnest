import { RotateCcw, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FaviconWithFallback } from "@/components/FaviconWithFallback";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { LinkItem } from "@/types/link";

interface TrashViewProps {
  isOpen: boolean;
  onClose: () => void;
  trashedLinks: LinkItem[];
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onEmptyTrash: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 7) return `${days} dias atrás`;
  if (days < 30) return `${Math.floor(days / 7)} semana(s) atrás`;
  return `${Math.floor(days / 30)} mês(es) atrás`;
}

function daysUntilPurge(dateStr: string): number {
  const deletedAt = new Date(dateStr).getTime();
  const purgeAt = deletedAt + 30 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((purgeAt - Date.now()) / (1000 * 60 * 60 * 24)));
}

export function TrashView({
  isOpen,
  onClose,
  trashedLinks,
  onRestore,
  onPermanentDelete,
  onEmptyTrash,
}: TrashViewProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Lixeira
            {trashedLinks.length > 0 && (
              <Badge variant="secondary" className="ml-1">{trashedLinks.length}</Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Links excluídos são removidos permanentemente após 30 dias.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          {trashedLinks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Trash2 className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">A lixeira está vazia</p>
            </div>
          ) : (
            <>
              {/* Empty trash button */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="w-full">
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Esvaziar lixeira ({trashedLinks.length})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Esvaziar lixeira?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso excluirá permanentemente {trashedLinks.length} link(s). Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={onEmptyTrash}
                    >
                      Excluir tudo permanentemente
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Trashed items */}
              {trashedLinks
                .sort((a, b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime())
                .map((link) => (
                <div
                  key={link.id}
                  className="flex items-start gap-3 rounded-lg border p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <FaviconWithFallback url={link.url} favicon={link.favicon} size={20} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{link.title || link.url}</p>
                    <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Excluído {timeAgo(link.deletedAt!)}</span>
                      <span className="text-destructive/70">
                        • {daysUntilPurge(link.deletedAt!)} dia(s) restantes
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Restaurar"
                      onClick={() => onRestore(link.id)}
                    >
                      <RotateCcw className="h-4 w-4 text-green-600" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Excluir permanentemente"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
                          <AlertDialogDescription>
                            O link "{link.title || link.url}" será excluído permanentemente. Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => onPermanentDelete(link.id)}
                          >
                            Excluir permanentemente
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
