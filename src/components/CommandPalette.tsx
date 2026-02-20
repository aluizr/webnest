import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Plus, Search, LayoutGrid, List, Table2, Columns3,
  Download, Upload, BarChart3, Star, Clock, Moon,
  Sun, Keyboard, LogOut
} from "lucide-react";
import type { ViewMode } from "@/types/link";

export interface CommandAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  group: string;
  keywords?: string[];
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  actions: CommandAction[];
}

export function CommandPalette({ isOpen, onOpenChange, actions }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter actions based on query
  const filteredActions = useMemo(() => {
    if (!query.trim()) return actions;
    const q = query.toLowerCase();
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.group.toLowerCase().includes(q) ||
        a.keywords?.some((k) => k.toLowerCase().includes(q))
    );
  }, [actions, query]);

  // Group filtered actions
  const grouped = useMemo(() => {
    const groups = new Map<string, CommandAction[]>();
    for (const action of filteredActions) {
      if (!groups.has(action.group)) groups.set(action.group, []);
      groups.get(action.group)!.push(action);
    }
    return groups;
  }, [filteredActions]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredActions.length]);

  // Scroll selected item into view
  useEffect(() => {
    const items = listRef.current?.querySelectorAll("[data-command-item]");
    if (items?.[selectedIndex]) {
      items[selectedIndex].scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const executeAction = useCallback((action: CommandAction) => {
    onOpenChange(false);
    // Small delay so dialog closes before action runs
    setTimeout(() => action.action(), 100);
  }, [onOpenChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredActions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredActions[selectedIndex]) {
          executeAction(filteredActions[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        onOpenChange(false);
        break;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-[480px] gap-0 [&>button]:hidden">
        {/* Search input */}
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite um comando..."
            className="border-0 shadow-none focus-visible:ring-0 h-11 px-0 text-sm"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[320px] overflow-y-auto p-1">
          {filteredActions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">Nenhum comando encontrado</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Tente outro termo de busca
              </p>
            </div>
          ) : (
            Array.from(grouped).map(([groupName, items]) => (
              <div key={groupName}>
                <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {groupName}
                </p>
                {items.map((item) => {
                  const globalIndex = filteredActions.indexOf(item);
                  const Icon = item.icon;
                  const isSelected = globalIndex === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      data-command-item
                      onClick={() => executeAction(item)}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      className={`flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm transition-colors ${
                        isSelected
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-60" />
                      <div className="flex-1 text-left">
                        <span>{item.label}</span>
                        {item.description && (
                          <span className="ml-2 text-xs text-muted-foreground">{item.description}</span>
                        )}
                      </div>
                      {item.shortcut && (
                        <kbd className="hidden sm:inline-flex h-5 items-center rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
                          {item.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-3 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 font-mono">↑↓</kbd> navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 font-mono">↵</kbd> executar
            </span>
          </div>
          <span>{filteredActions.length} comando{filteredActions.length !== 1 ? "s" : ""}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Pre-built command factory for common actions
export function buildDefaultCommands({
  onNewLink,
  onFocusSearch,
  onSetView,
  onOpenStats,
  onOpenExport,
  onOpenImport,
  onOpenHistory,
  onToggleFavorites,
  onSignOut,
}: {
  onNewLink: () => void;
  onFocusSearch: () => void;
  onSetView: (mode: ViewMode) => void;
  onOpenStats: () => void;
  onOpenExport: () => void;
  onOpenImport: () => void;
  onOpenHistory: () => void;
  onToggleFavorites: () => void;
  onSignOut: () => void;
}): CommandAction[] {
  return [
    {
      id: "new-link",
      label: "Novo link",
      description: "Adicionar um novo link",
      icon: Plus,
      group: "Ações",
      keywords: ["adicionar", "criar", "novo", "add", "new"],
      shortcut: "N",
      action: onNewLink,
    },
    {
      id: "search",
      label: "Buscar",
      description: "Focar na barra de busca",
      icon: Search,
      group: "Ações",
      keywords: ["procurar", "pesquisar", "find", "search"],
      shortcut: "Ctrl+K",
      action: onFocusSearch,
    },
    {
      id: "view-grid",
      label: "Visualização Grade",
      icon: LayoutGrid,
      group: "Visualização",
      keywords: ["grid", "grade", "cards"],
      action: () => onSetView("grid"),
    },
    {
      id: "view-list",
      label: "Visualização Lista",
      icon: List,
      group: "Visualização",
      keywords: ["lista", "list", "coluna"],
      action: () => onSetView("list"),
    },
    {
      id: "view-table",
      label: "Visualização Tabela",
      icon: Table2,
      group: "Visualização",
      keywords: ["tabela", "table", "linhas", "rows"],
      action: () => onSetView("table"),
    },
    {
      id: "view-board",
      label: "Visualização Board",
      icon: Columns3,
      group: "Visualização",
      keywords: ["board", "kanban", "colunas"],
      action: () => onSetView("board"),
    },
    {
      id: "stats",
      label: "Estatísticas",
      description: "Abrir dashboard de estatísticas",
      icon: BarChart3,
      group: "Ferramentas",
      keywords: ["stats", "dashboard", "gráficos", "charts"],
      shortcut: "S",
      action: onOpenStats,
    },
    {
      id: "history",
      label: "Histórico",
      description: "Ver alterações recentes",
      icon: Clock,
      group: "Ferramentas",
      keywords: ["histórico", "log", "atividade", "history"],
      action: onOpenHistory,
    },
    {
      id: "favorites",
      label: "Filtrar favoritos",
      description: "Mostrar apenas favoritos",
      icon: Star,
      group: "Filtros",
      keywords: ["favoritos", "estrela", "star"],
      action: onToggleFavorites,
    },
    {
      id: "export",
      label: "Exportar links",
      description: "Exportar coleção de links",
      icon: Download,
      group: "Dados",
      keywords: ["exportar", "download", "backup", "salvar"],
      shortcut: "E",
      action: onOpenExport,
    },
    {
      id: "import",
      label: "Importar links",
      description: "Importar links de arquivo",
      icon: Upload,
      group: "Dados",
      keywords: ["importar", "upload", "carregar"],
      shortcut: "I",
      action: onOpenImport,
    },
    {
      id: "signout",
      label: "Sair",
      description: "Encerrar sessão",
      icon: LogOut,
      group: "Conta",
      keywords: ["logout", "sair", "desconectar"],
      action: onSignOut,
    },
  ];
}
