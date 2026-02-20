import { LayoutGrid, List, Table2, Columns3, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ViewMode } from "@/types/link";

interface ViewSwitcherProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const views: { mode: ViewMode; label: string; icon: React.ElementType; description: string }[] = [
  { mode: "grid", label: "Grade", icon: LayoutGrid, description: "Cards em grid" },
  { mode: "list", label: "Lista", icon: List, description: "Cards em coluna" },
  { mode: "table", label: "Tabela", icon: Table2, description: "Linhas compactas" },
  { mode: "board", label: "Board", icon: Columns3, description: "Kanban por categoria" },
];

const activeIcons: Record<ViewMode, React.ElementType> = {
  grid: LayoutGrid,
  list: List,
  table: Table2,
  board: Columns3,
};

export function ViewSwitcher({ viewMode, onViewModeChange }: ViewSwitcherProps) {
  const ActiveIcon = activeIcons[viewMode];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" title="Alternar visualização (G)">
          <ActiveIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-1">
        {views.map((view) => {
          const Icon = view.icon;
          const isActive = viewMode === view.mode;
          return (
            <button
              key={view.mode}
              onClick={() => onViewModeChange(view.mode)}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <div className="flex-1 text-left">
                <span>{view.label}</span>
                <p className="text-[10px] text-muted-foreground leading-tight">{view.description}</p>
              </div>
              {isActive && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
