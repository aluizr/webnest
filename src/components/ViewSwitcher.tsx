import { LayoutGrid, List, Table2, Columns3, SquareStack, GalleryHorizontalEnd, Check, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ViewMode } from "@/types/link";

export type GridColumns = 2 | 3 | 4 | 5;
export type CardSize = "sm" | "md" | "lg";

interface ViewSwitcherProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  gridColumns: GridColumns;
  onGridColumnsChange: (cols: GridColumns) => void;
  cardSize: CardSize;
  onCardSizeChange: (size: CardSize) => void;
}

const views: { mode: ViewMode; label: string; icon: React.ElementType; description: string }[] = [
  { mode: "grid", label: "Grade", icon: LayoutGrid, description: "Cards em grid" },
  { mode: "list", label: "Lista", icon: List, description: "Cards em coluna" },
  { mode: "cards", label: "Cartões", icon: SquareStack, description: "Tiles compactos" },
  { mode: "table", label: "Tabela", icon: Table2, description: "Linhas compactas" },
  { mode: "board", label: "Board", icon: Columns3, description: "Kanban por categoria" },
  { mode: "gallery", label: "Galeria", icon: GalleryHorizontalEnd, description: "Masonry com covers" },
];

const activeIcons: Record<ViewMode, React.ElementType> = {
  grid: LayoutGrid,
  list: List,
  cards: SquareStack,
  table: Table2,
  board: Columns3,
  gallery: GalleryHorizontalEnd,
};

const columnOptions: GridColumns[] = [2, 3, 4, 5];

const cardSizeOptions: { value: CardSize; label: string }[] = [
  { value: "sm", label: "P" },
  { value: "md", label: "M" },
  { value: "lg", label: "G" },
];

export function ViewSwitcher({ viewMode, onViewModeChange, gridColumns, onGridColumnsChange, cardSize, onCardSizeChange }: ViewSwitcherProps) {
  const ActiveIcon = activeIcons[viewMode];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" title="Alternar visualização (G)">
          <ActiveIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-1">
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

        {/* Grid size selector — only when grid is active */}
        {viewMode === "grid" && (
          <>
            <div className="mx-2 my-1.5 border-t" />
            <div className="px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Tamanho da grade</p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={gridColumns <= 2}
                  onClick={(e) => {
                    e.stopPropagation();
                    const i = columnOptions.indexOf(gridColumns);
                    if (i > 0) onGridColumnsChange(columnOptions[i - 1]);
                  }}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <div className="flex-1 flex justify-center gap-1">
                  {columnOptions.map((col) => (
                    <button
                      key={col}
                      onClick={(e) => {
                        e.stopPropagation();
                        onGridColumnsChange(col);
                      }}
                      className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                        gridColumns === col
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {col}
                    </button>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={gridColumns >= 5}
                  onClick={(e) => {
                    e.stopPropagation();
                    const i = columnOptions.indexOf(gridColumns);
                    if (i < columnOptions.length - 1) onGridColumnsChange(columnOptions[i + 1]);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
        {/* Card size selector — only when cards is active */}
        {viewMode === "cards" && (
          <>
            <div className="mx-2 my-1.5 border-t" />
            <div className="px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Tamanho do cartão</p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={cardSize === "sm"}
                  onClick={(e) => {
                    e.stopPropagation();
                    const i = cardSizeOptions.findIndex((o) => o.value === cardSize);
                    if (i > 0) onCardSizeChange(cardSizeOptions[i - 1].value);
                  }}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <div className="flex-1 flex justify-center gap-1">
                  {cardSizeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCardSizeChange(opt.value);
                      }}
                      className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                        cardSize === opt.value
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={cardSize === "lg"}
                  onClick={(e) => {
                    e.stopPropagation();
                    const i = cardSizeOptions.findIndex((o) => o.value === cardSize);
                    if (i < cardSizeOptions.length - 1) onCardSizeChange(cardSizeOptions[i + 1].value);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
