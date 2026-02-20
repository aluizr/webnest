import {
  Plus, Pencil, Trash2, Star, StarOff, GripVertical,
  FolderPlus, FolderMinus, FolderEdit,
  Download, Upload, Clock
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { ActivityLogEntry, ActivityAction } from "@/types/link";

interface ActivityPanelProps {
  isOpen: boolean;
  onClose: () => void;
  entries: ActivityLogEntry[];
  onClear: () => void;
}

const ACTION_ICONS: Record<ActivityAction, React.ElementType> = {
  "link:created": Plus,
  "link:updated": Pencil,
  "link:deleted": Trash2,
  "link:favorited": Star,
  "link:unfavorited": StarOff,
  "link:reordered": GripVertical,
  "category:created": FolderPlus,
  "category:deleted": FolderMinus,
  "category:renamed": FolderEdit,
  "import:completed": Upload,
  "export:completed": Download,
};

const ACTION_COLORS: Record<ActivityAction, string> = {
  "link:created": "text-green-500 bg-green-500/10",
  "link:updated": "text-blue-500 bg-blue-500/10",
  "link:deleted": "text-red-500 bg-red-500/10",
  "link:favorited": "text-yellow-500 bg-yellow-500/10",
  "link:unfavorited": "text-muted-foreground bg-muted",
  "link:reordered": "text-purple-500 bg-purple-500/10",
  "category:created": "text-emerald-500 bg-emerald-500/10",
  "category:deleted": "text-red-500 bg-red-500/10",
  "category:renamed": "text-blue-500 bg-blue-500/10",
  "import:completed": "text-indigo-500 bg-indigo-500/10",
  "export:completed": "text-teal-500 bg-teal-500/10",
};

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const diff = now - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "agora";
  if (minutes < 60) return `${minutes}min atrás`;
  if (hours < 24) return `${hours}h atrás`;
  if (days < 7) return `${days}d atrás`;
  return new Date(timestamp).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function groupByDate(entries: ActivityLogEntry[]): Map<string, ActivityLogEntry[]> {
  const groups = new Map<string, ActivityLogEntry[]>();

  for (const entry of entries) {
    const date = new Date(entry.timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    let label: string;
    if (diffDays === 0) label = "Hoje";
    else if (diffDays === 1) label = "Ontem";
    else if (diffDays < 7) label = "Esta semana";
    else if (diffDays < 30) label = "Este mês";
    else label = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(entry);
  }

  return groups;
}

export function ActivityPanel({ isOpen, onClose, entries, onClear }: ActivityPanelProps) {
  const grouped = groupByDate(entries);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[360px] sm:w-[420px] p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Histórico
            </SheetTitle>
            {entries.length > 0 && (
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={onClear}>
                Limpar
              </Button>
            )}
          </div>
          <SheetDescription>
            Registro de alterações recentes
          </SheetDescription>
        </SheetHeader>

        <div className="h-[calc(100vh-120px)] overflow-y-auto">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <Clock className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma atividade registrada</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Ações como criar, editar e excluir links aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="px-4 py-3">
              {Array.from(grouped).map(([label, items]) => (
                <div key={label} className="mb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                    {label}
                  </p>
                  <div className="space-y-1">
                    {items.map((entry) => {
                      const Icon = ACTION_ICONS[entry.action];
                      const colorClass = ACTION_COLORS[entry.action];
                      return (
                        <div
                          key={entry.id}
                          className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-muted/50 transition-colors"
                        >
                          <div className={`mt-0.5 rounded-md p-1.5 ${colorClass}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{entry.title}</p>
                            {entry.details && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {entry.details}
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-1">
                            {formatRelativeTime(entry.timestamp)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
