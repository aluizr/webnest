import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Star, ExternalLink, Pencil, Trash2, StickyNote, Check, Minus, ArrowUp, ArrowDown, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FaviconWithFallback } from "@/components/FaviconWithFallback";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { COMPACT_BADGE_CLASS, ICON_BTN_MD_CLASS, TEXT_XS_CLASS } from "@/lib/utils";
import type { LinkItem } from "@/types/link";

const statusLabel: Record<LinkItem["status"], string> = {
  backlog: "Backlog",
  in_progress: "Em progresso",
  done: "Concluído",
};

const priorityLabel: Record<LinkItem["priority"], string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

type TableColumnId =
  | "favicon"
  | "title"
  | "description"
  | "category"
  | "tags"
  | "status"
  | "priority"
  | "dueDate";

type SortDirection = "asc" | "desc";

interface SortRule {
  column: TableColumnId;
  direction: SortDirection;
}

interface TableFilters {
  query: string;
  category: string;
  tag: string;
  status: "all" | LinkItem["status"];
  priority: "all" | LinkItem["priority"];
  favorite: "all" | "yes" | "no";
}

type InlineEditableColumn = "title" | "category" | "tags" | "dueDate";
type TableDensity = "compact" | "normal";

const INLINE_EDIT_SEQUENCE: InlineEditableColumn[] = ["title", "category", "tags", "dueDate"];

interface ColumnConfig {
  id: TableColumnId;
  label: string;
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
  sortable: boolean;
}

const TABLE_COLUMNS: ColumnConfig[] = [
  { id: "favicon", label: "", minWidth: 54, maxWidth: 84, defaultWidth: 64, sortable: false },
  { id: "title", label: "Titulo", minWidth: 220, maxWidth: 560, defaultWidth: 320, sortable: true },
  { id: "description", label: "Descricao", minWidth: 180, maxWidth: 460, defaultWidth: 280, sortable: true },
  { id: "category", label: "Categoria", minWidth: 130, maxWidth: 320, defaultWidth: 170, sortable: true },
  { id: "tags", label: "Tags", minWidth: 160, maxWidth: 380, defaultWidth: 220, sortable: true },
  { id: "status", label: "Status", minWidth: 130, maxWidth: 220, defaultWidth: 150, sortable: true },
  { id: "priority", label: "Prioridade", minWidth: 130, maxWidth: 220, defaultWidth: 150, sortable: true },
  { id: "dueDate", label: "Prazo", minWidth: 120, maxWidth: 220, defaultWidth: 140, sortable: true },
];

const DEFAULT_VISIBLE_COLUMNS: TableColumnId[] = [
  "favicon",
  "title",
  "description",
  "category",
  "tags",
  "status",
  "priority",
  "dueDate",
];

const COLUMN_PRESETS: Record<"compact" | "analysis" | "full", { label: string; columns: TableColumnId[] }> = {
  compact: { label: "Compacta", columns: ["favicon", "title", "category", "status", "priority"] },
  analysis: { label: "Analise", columns: ["favicon", "title", "description", "tags", "status", "priority", "dueDate"] },
  full: { label: "Completa", columns: [...DEFAULT_VISIBLE_COLUMNS] },
};

const STORAGE_VISIBLE_COLUMNS = "table-visible-columns";
const STORAGE_COLUMN_WIDTHS = "table-column-widths";
const STORAGE_TABLE_DENSITY = "table-density";

const DEFAULT_FILTERS: TableFilters = {
  query: "",
  category: "",
  tag: "",
  status: "all",
  priority: "all",
  favorite: "all",
};

const COLUMN_MAP: Record<TableColumnId, ColumnConfig> = Object.fromEntries(
  TABLE_COLUMNS.map((column) => [column.id, column])
) as Record<TableColumnId, ColumnConfig>;

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function getSortableValue(link: LinkItem, column: TableColumnId): string | number {
  switch (column) {
    case "title":
      return (link.title || link.url).toLowerCase();
    case "description":
      return (link.description || "").toLowerCase();
    case "category":
      return (link.category || "").toLowerCase();
    case "tags":
      return link.tags.join(",").toLowerCase();
    case "status":
      return link.status;
    case "priority":
      return link.priority;
    case "dueDate":
      return link.dueDate ? new Date(link.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    case "favicon":
      return getHostname(link.url).toLowerCase();
    default:
      return "";
  }
}

function getInitialVisibleColumns(): TableColumnId[] {
  if (typeof window === "undefined") {
    return DEFAULT_VISIBLE_COLUMNS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_VISIBLE_COLUMNS);
    if (!raw) return DEFAULT_VISIBLE_COLUMNS;
    const parsed = JSON.parse(raw) as string[];
    const valid = parsed.filter((column): column is TableColumnId =>
      TABLE_COLUMNS.some((c) => c.id === column)
    );
    return valid.length > 0 ? valid : DEFAULT_VISIBLE_COLUMNS;
  } catch {
    return DEFAULT_VISIBLE_COLUMNS;
  }
}

function getInitialColumnWidths(): Record<TableColumnId, number> {
  const defaults = TABLE_COLUMNS.reduce((acc, column) => {
    acc[column.id] = column.defaultWidth;
    return acc;
  }, {} as Record<TableColumnId, number>);

  if (typeof window === "undefined") {
    return defaults;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_COLUMN_WIDTHS);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Record<TableColumnId, number>>;

    for (const column of TABLE_COLUMNS) {
      const value = parsed[column.id];
      if (typeof value === "number") {
        defaults[column.id] = Math.min(column.maxWidth, Math.max(column.minWidth, value));
      }
    }

    return defaults;
  } catch {
    return defaults;
  }
}

interface LinkTableViewProps {
  links: LinkItem[];
  onToggleFavorite: (id: string) => void;
  onUpdateLink: (id: string, data: Partial<Omit<LinkItem, "id" | "createdAt" | "position">>) => void;
  onEdit: (link: LinkItem) => void;
  onDelete: (id: string) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string, shiftKey?: boolean) => void;
  onSelectAll?: () => void;
}

export function LinkTableView({ links, onToggleFavorite, onUpdateLink, onEdit, onDelete, selectedIds, onToggleSelect, onSelectAll }: LinkTableViewProps) {
  const [visibleColumns, setVisibleColumns] = useState<TableColumnId[]>(() => getInitialVisibleColumns());
  const [columnWidths, setColumnWidths] = useState<Record<TableColumnId, number>>(() => getInitialColumnWidths());
  const [sortRules, setSortRules] = useState<SortRule[]>([]);
  const [filters, setFilters] = useState<TableFilters>(DEFAULT_FILTERS);
  const [editingCell, setEditingCell] = useState<{ id: string; column: InlineEditableColumn } | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);
  const [density, setDensity] = useState<TableDensity>(() => {
    if (typeof window === "undefined") return "compact";
    const saved = window.localStorage.getItem(STORAGE_TABLE_DENSITY);
    return saved === "normal" ? "normal" : "compact";
  });
  const skipNextBlurCommitRef = useRef(false);
  const resizeRef = useRef<{ column: TableColumnId; startX: number; startWidth: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const snapTimeoutRef = useRef<number | null>(null);
  const snapLockRef = useRef(false);

  const getInlineInitialValue = (link: LinkItem, column: InlineEditableColumn) => {
    if (column === "title") return link.title || "";
    if (column === "category") return link.category || "";
    if (column === "tags") return link.tags.join(", ");
    if (!link.dueDate) return "";

    const parsed = new Date(link.dueDate);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toISOString().slice(0, 10);
  };

  const beginInlineEdit = (link: LinkItem, column: InlineEditableColumn) => {
    const value = getInlineInitialValue(link, column);

    setEditingCell({ id: link.id, column });
    setEditingValue(value);
  };

  const cancelInlineEdit = () => {
    setEditingCell(null);
    setEditingValue("");
  };

  const commitInlineEdit = useCallback((cell: { id: string; column: InlineEditableColumn } | null, value: string) => {
    if (!cell) return;

    const rawValue = value.trim();

    if (cell.column === "title") {
      onUpdateLink(cell.id, { title: rawValue });
    }

    if (cell.column === "category") {
      onUpdateLink(cell.id, { category: rawValue });
    }

    if (cell.column === "tags") {
      const tags = rawValue
        ? rawValue.split(",").map((tag) => tag.trim()).filter(Boolean)
        : [];
      onUpdateLink(cell.id, { tags });
    }

    if (cell.column === "dueDate") {
      onUpdateLink(cell.id, { dueDate: rawValue || null });
    }

    setEditingCell(null);
    setEditingValue("");
  }, [onUpdateLink]);

  const moveInlineEdit = useCallback((cell: { id: string; column: InlineEditableColumn }, backward: boolean, list: LinkItem[]) => {
    const rowIndex = list.findIndex((link) => link.id === cell.id);
    const colIndex = INLINE_EDIT_SEQUENCE.indexOf(cell.column);
    if (rowIndex === -1 || colIndex === -1) return;

    let nextRowIndex = rowIndex;
    let nextColIndex = colIndex + (backward ? -1 : 1);

    if (nextColIndex < 0) {
      nextRowIndex -= 1;
      nextColIndex = INLINE_EDIT_SEQUENCE.length - 1;
    }

    if (nextColIndex >= INLINE_EDIT_SEQUENCE.length) {
      nextRowIndex += 1;
      nextColIndex = 0;
    }

    if (nextRowIndex < 0 || nextRowIndex >= list.length) return;

    beginInlineEdit(list[nextRowIndex], INLINE_EDIT_SEQUENCE[nextColIndex]);
  }, []);

  const handleInlineInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, linkList: LinkItem[]) => {
    if (!editingCell) return;

    if (event.key === "Enter") {
      event.preventDefault();
      commitInlineEdit(editingCell, editingValue);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelInlineEdit();
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      skipNextBlurCommitRef.current = true;
      const currentCell = editingCell;
      const currentValue = editingValue;
      commitInlineEdit(currentCell, currentValue);
      moveInlineEdit(currentCell, event.shiftKey, linkList);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_VISIBLE_COLUMNS, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_COLUMN_WIDTHS, JSON.stringify(columnWidths));
  }, [columnWidths]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_TABLE_DENSITY, density);
  }, [density]);

  const processedLinks = useMemo(() => {
    let next = [...links];

    if (filters.query.trim()) {
      const needle = filters.query.toLowerCase();
      next = next.filter((link) =>
        [link.title, link.url, link.description].some((value) => (value || "").toLowerCase().includes(needle))
      );
    }

    if (filters.category.trim()) {
      const needle = filters.category.toLowerCase();
      next = next.filter((link) => (link.category || "").toLowerCase().includes(needle));
    }

    if (filters.tag.trim()) {
      const needle = filters.tag.toLowerCase();
      next = next.filter((link) => link.tags.some((tag) => tag.toLowerCase().includes(needle)));
    }

    if (filters.status !== "all") {
      next = next.filter((link) => link.status === filters.status);
    }

    if (filters.priority !== "all") {
      next = next.filter((link) => link.priority === filters.priority);
    }

    if (filters.favorite === "yes") {
      next = next.filter((link) => link.isFavorite);
    }

    if (filters.favorite === "no") {
      next = next.filter((link) => !link.isFavorite);
    }

    if (sortRules.length > 0) {
      next.sort((a, b) => {
        for (const rule of sortRules) {
          const aValue = getSortableValue(a, rule.column);
          const bValue = getSortableValue(b, rule.column);

          if (aValue === bValue) continue;

          const result = aValue > bValue ? 1 : -1;
          return rule.direction === "asc" ? result : -result;
        }
        return 0;
      });
    }

    return next;
  }, [links, filters, sortRules]);

  const allSelected = selectedIds && processedLinks.length > 0 && processedLinks.every((l) => selectedIds.has(l.id));
  const someSelected = selectedIds && processedLinks.some((l) => selectedIds.has(l.id)) && !allSelected;

  const setPreset = (preset: "compact" | "analysis" | "full") => {
    setVisibleColumns(COLUMN_PRESETS[preset].columns);
  };

  const toggleColumn = (columnId: TableColumnId) => {
    setVisibleColumns((prev) => {
      if (prev.includes(columnId)) {
        if (prev.length === 1) return prev;
        return prev.filter((id) => id !== columnId);
      }
      return [...prev, columnId];
    });
  };

  const cycleSortDirection = (direction?: SortDirection): SortDirection | undefined => {
    if (!direction) return "asc";
    if (direction === "asc") return "desc";
    return undefined;
  };

  const handleSortClick = (column: TableColumnId, shiftKey: boolean) => {
    if (!COLUMN_MAP[column].sortable) return;

    setSortRules((prev) => {
      const existing = prev.find((rule) => rule.column === column);
      const nextDirection = cycleSortDirection(existing?.direction);

      if (!shiftKey) {
        return nextDirection ? [{ column, direction: nextDirection }] : [];
      }

      const withoutCurrent = prev.filter((rule) => rule.column !== column);
      if (!nextDirection) return withoutCurrent;
      return [...withoutCurrent, { column, direction: nextDirection }];
    });
  };

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!resizeRef.current) return;

    const { column, startX, startWidth } = resizeRef.current;
    const config = COLUMN_MAP[column];
    const delta = event.clientX - startX;
    const nextWidth = Math.max(config.minWidth, Math.min(config.maxWidth, startWidth + delta));

    setColumnWidths((prev) => ({ ...prev, [column]: nextWidth }));
  }, []);

  const stopResize = useCallback(() => {
    resizeRef.current = null;
    document.body.style.cursor = "";
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", stopResize);
  }, [handleMouseMove]);

  const startResize = (column: TableColumnId, event: React.MouseEvent) => {
    event.preventDefault();
    resizeRef.current = {
      column,
      startX: event.clientX,
      startWidth: columnWidths[column],
    };

    document.body.style.cursor = "col-resize";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopResize);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopResize);
    };
  }, [handleMouseMove, stopResize]);

  const updateHorizontalFades = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;

    const { scrollLeft, clientWidth, scrollWidth } = container;
    const maxScrollLeft = scrollWidth - clientWidth;
    setShowLeftFade(scrollLeft > 2);
    setShowRightFade(maxScrollLeft - scrollLeft > 2);
  }, []);

  const horizontalSnapPoints = useMemo(() => {
    const points: number[] = [0];
    let offset = 0;

    // Keep title anchored and snap scrolling to the remaining columns.
    for (const columnId of visibleColumns) {
      if (columnId === "title") continue;
      points.push(offset);
      offset += columnWidths[columnId];
    }

    return Array.from(new Set(points)).sort((a, b) => a - b);
  }, [visibleColumns, columnWidths]);

  const scheduleHorizontalSnap = useCallback(() => {
    if (snapTimeoutRef.current) {
      window.clearTimeout(snapTimeoutRef.current);
    }

    snapTimeoutRef.current = window.setTimeout(() => {
      const container = scrollRef.current;
      if (!container || snapLockRef.current) return;

      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      if (maxScrollLeft <= 0) return;

      const current = container.scrollLeft;
      let target = horizontalSnapPoints[0] ?? 0;

      for (const point of horizontalSnapPoints) {
        if (Math.abs(point - current) < Math.abs(target - current)) {
          target = point;
        }
      }

      target = Math.max(0, Math.min(maxScrollLeft, target));

      if (Math.abs(target - current) < 10) return;

      snapLockRef.current = true;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      container.scrollTo({ left: target, behavior: reducedMotion ? "auto" : "smooth" });

      window.setTimeout(() => {
        snapLockRef.current = false;
      }, reducedMotion ? 0 : 240);
    }, 130);
  }, [horizontalSnapPoints]);

  useEffect(() => {
    updateHorizontalFades();
    window.addEventListener("resize", updateHorizontalFades);
    return () => {
      window.removeEventListener("resize", updateHorizontalFades);
      if (snapTimeoutRef.current) {
        window.clearTimeout(snapTimeoutRef.current);
      }
    };
  }, [updateHorizontalFades]);

  useEffect(() => {
    updateHorizontalFades();
  }, [visibleColumns, columnWidths, processedLinks.length, updateHorizontalFades]);

  const estimateAutoWidth = (column: TableColumnId) => {
    const config = COLUMN_MAP[column];
    const labelLength = config.label.length;
    const maxContentLength = processedLinks.reduce((max, link) => {
      let value = "";

      switch (column) {
        case "favicon":
          value = getHostname(link.url);
          break;
        case "title":
          value = `${link.title || link.url} ${getHostname(link.url)}`;
          break;
        case "description":
          value = link.description || "";
          break;
        case "category":
          value = link.category || "";
          break;
        case "tags":
          value = link.tags.join(", ");
          break;
        case "status":
          value = statusLabel[link.status];
          break;
        case "priority":
          value = priorityLabel[link.priority];
          break;
        case "dueDate":
          value = link.dueDate ? new Date(link.dueDate).toLocaleDateString("pt-BR") : "";
          break;
      }

      return Math.max(max, value.length);
    }, labelLength);

    const estimated = maxContentLength * 7.2 + 44;
    return Math.min(config.maxWidth, Math.max(config.minWidth, estimated));
  };

  const autoFitColumn = (column: TableColumnId) => {
    setColumnWidths((prev) => ({ ...prev, [column]: estimateAutoWidth(column) }));
  };

  const clearFiltersAndSorting = () => {
    setFilters(DEFAULT_FILTERS);
    setSortRules([]);
  };

  const getSortMeta = (column: TableColumnId) => {
    const index = sortRules.findIndex((rule) => rule.column === column);
    if (index === -1) return null;
    return { index, direction: sortRules[index].direction };
  };

  const toggleSelectAllVisible = () => {
    if (!onToggleSelect) return;

    if (allSelected) {
      processedLinks.forEach((link) => {
        if (selectedIds?.has(link.id)) {
          onToggleSelect(link.id);
        }
      });
      return;
    }

    if (onSelectAll && processedLinks.length === links.length) {
      onSelectAll();
      return;
    }

    processedLinks.forEach((link) => {
      if (!selectedIds?.has(link.id)) {
        onToggleSelect(link.id);
      }
    });
  };

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className={`border-b bg-muted/20 ${density === "compact" ? "p-2 md:p-2.5" : "p-3 md:p-4"}`}>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
          <Input
            value={filters.query}
            onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))}
            placeholder="Filtrar titulo, URL ou descricao"
            className={density === "compact" ? "h-7 text-xs" : "h-8"}
          />
          <Input
            value={filters.category}
            onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
            placeholder="Categoria"
            className={density === "compact" ? "h-7 text-xs" : "h-8"}
          />
          <Input
            value={filters.tag}
            onChange={(e) => setFilters((prev) => ({ ...prev, tag: e.target.value }))}
            placeholder="Tag"
            className={density === "compact" ? "h-7 text-xs" : "h-8"}
          />
          <Select
            value={filters.status}
            onValueChange={(value: TableFilters["status"]) => setFilters((prev) => ({ ...prev, status: value }))}
          >
            <SelectTrigger className={density === "compact" ? "h-7 text-xs" : "h-8"}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Status: todos</SelectItem>
              <SelectItem value="backlog">Backlog</SelectItem>
              <SelectItem value="in_progress">Em progresso</SelectItem>
              <SelectItem value="done">Concluido</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.priority}
            onValueChange={(value: TableFilters["priority"]) => setFilters((prev) => ({ ...prev, priority: value }))}
          >
            <SelectTrigger className={density === "compact" ? "h-7 text-xs" : "h-8"}>
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Prioridade: todas</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.favorite}
            onValueChange={(value: TableFilters["favorite"]) => setFilters((prev) => ({ ...prev, favorite: value }))}
          >
            <SelectTrigger className={density === "compact" ? "h-7 text-xs" : "h-8"}>
              <SelectValue placeholder="Favoritos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Favoritos: todos</SelectItem>
              <SelectItem value="yes">Somente favoritos</SelectItem>
              <SelectItem value="no">Somente nao favoritos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={density === "compact" ? "h-7 text-xs" : "h-8"}>
                <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
                Colunas
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Presets</p>
              <div className="mt-2 flex gap-1.5">
                <Button size="sm" variant="outline" className="h-7" onClick={() => setPreset("compact")}>Compacta</Button>
                <Button size="sm" variant="outline" className="h-7" onClick={() => setPreset("analysis")}>Analise</Button>
                <Button size="sm" variant="outline" className="h-7" onClick={() => setPreset("full")}>Completa</Button>
              </div>

              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Visiveis</p>
              <div className="mt-2 grid gap-2">
                {TABLE_COLUMNS.map((column) => (
                  <label key={column.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={visibleColumns.includes(column.id)}
                      onCheckedChange={() => toggleColumn(column.id)}
                    />
                    <span>{column.label || "Favicon"}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="sm" className={density === "compact" ? "h-7 text-xs" : "h-8"} onClick={clearFiltersAndSorting}>
            Limpar filtros e ordenacao
          </Button>

          <div className="flex items-center gap-1 rounded-md border bg-background p-0.5">
            <Button
              type="button"
              variant={density === "compact" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setDensity("compact")}
            >
              Compacta
            </Button>
            <Button
              type="button"
              variant={density === "normal" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setDensity("normal")}
            >
              Normal
            </Button>
          </div>

          <span className="ml-auto text-xs text-muted-foreground">
            {processedLinks.length} de {links.length} links
          </span>
        </div>
      </div>

      <div className="relative">
        {showLeftFade && (
          <div className="pointer-events-none absolute inset-y-0 left-0 z-40 w-6 bg-gradient-to-r from-background to-transparent" />
        )}
        {showRightFade && (
          <div className="pointer-events-none absolute inset-y-0 right-0 z-40 w-6 bg-gradient-to-l from-background to-transparent" />
        )}

        <div
          ref={scrollRef}
          className="overflow-x-auto"
          onScroll={() => {
            updateHorizontalFades();
            if (!snapLockRef.current) {
              scheduleHorizontalSnap();
            }
          }}
        >
        <table className={density === "compact" ? "w-full text-xs" : "w-full text-sm"}>
          <thead>
            <tr className="border-b bg-muted/50">
              {onToggleSelect && (
                <th className={`sticky top-0 z-20 w-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 ${density === "compact" ? "px-3 py-2" : "px-4 py-3"}`}>
                  <button
                    onClick={toggleSelectAllVisible}
                    className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
                      allSelected
                        ? "bg-primary border-primary text-primary-foreground"
                        : someSelected
                          ? "bg-primary/20 border-primary text-primary"
                          : "bg-background border-muted-foreground/40 hover:border-muted-foreground/60"
                    }`}
                  >
                    {allSelected && <Check className="h-3 w-3" />}
                    {someSelected && !allSelected && <Minus className="h-3 w-3" />}
                  </button>
                </th>
              )}

              {visibleColumns.map((columnId) => {
                const column = COLUMN_MAP[columnId];
                const sortMeta = getSortMeta(columnId);
                const isPinnedTitle = columnId === "title";

                return (
                  <th
                    key={columnId}
                    className={`sticky top-0 relative bg-muted/95 text-left font-medium backdrop-blur supports-[backdrop-filter]:bg-muted/80 ${density === "compact" ? "px-3 py-2" : "px-4 py-3"} ${
                      isPinnedTitle ? "left-0 z-30 shadow-[6px_0_10px_-8px_hsl(var(--border))]" : "z-20"
                    }`}
                    style={{ width: columnWidths[columnId], minWidth: columnWidths[columnId], left: isPinnedTitle ? 0 : undefined }}
                  >
                    <button
                      type="button"
                      onClick={(e) => handleSortClick(columnId, e.shiftKey)}
                      className={`inline-flex items-center gap-1 rounded text-left ${column.sortable ? "hover:text-primary" : "cursor-default"}`}
                    >
                      <span>{column.label || ""}</span>
                      {sortMeta?.direction === "asc" && <ArrowUp className="h-3.5 w-3.5" />}
                      {sortMeta?.direction === "desc" && <ArrowDown className="h-3.5 w-3.5" />}
                      {sortMeta && sortRules.length > 1 && (
                        <span className="rounded bg-primary/15 px-1 text-[10px] text-primary">{sortMeta.index + 1}</span>
                      )}
                    </button>

                    <button
                      type="button"
                      title="Arraste para redimensionar. Duplo clique para auto-ajustar."
                      onMouseDown={(event) => startResize(columnId, event)}
                      onDoubleClick={(event) => {
                        event.preventDefault();
                        autoFitColumn(columnId);
                      }}
                      className="absolute right-0 top-0 h-full w-2 cursor-col-resize opacity-0 transition-opacity hover:bg-primary/20 group-hover:opacity-100"
                    />
                  </th>
                );
              })}

              <th className={`sticky right-0 top-0 z-30 w-28 bg-muted/95 text-right font-medium shadow-[-6px_0_10px_-8px_hsl(var(--border))] backdrop-blur supports-[backdrop-filter]:bg-muted/80 ${density === "compact" ? "px-3 py-2" : "px-4 py-3"}`}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {processedLinks.map((link) => (
              <tr
                key={link.id}
                className={`border-b last:border-b-0 hover:bg-muted/30 transition-colors group ${
                  selectedIds?.has(link.id)
                    ? "bg-primary/5"
                    : editingCell?.id === link.id
                      ? "bg-primary/5"
                      : ""
                }`}
              >
                {/* Selection checkbox */}
                {onToggleSelect && (
                  <td className={density === "compact" ? "px-3 py-2" : "px-4 py-3"}>
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleSelect(link.id, e.shiftKey); }}
                      className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
                        selectedIds?.has(link.id)
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-background border-muted-foreground/40 opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      {selectedIds?.has(link.id) && (
                        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  </td>
                )}

                {visibleColumns.map((columnId) => (
                  <td
                    key={columnId}
                    className={`${density === "compact" ? "px-3 py-2" : "px-4 py-3"} align-top transition-colors ${
                      editingCell?.id === link.id && editingCell.column === columnId
                        ? "bg-primary/10 shadow-[inset_0_0_0_1px_hsl(var(--primary))]"
                        : ""
                    } ${
                      columnId === "title"
                        ? "sticky left-0 z-10 bg-background/95 shadow-[6px_0_10px_-8px_hsl(var(--border))] backdrop-blur supports-[backdrop-filter]:bg-background/85"
                        : ""
                    }`}
                    style={{ left: columnId === "title" ? 0 : undefined }}
                  >
                    {columnId === "favicon" && (
                      <FaviconWithFallback url={link.url} favicon={link.favicon} size={20} />
                    )}

                    {columnId === "title" && (
                      <div className="max-w-full">
                        {editingCell?.id === link.id && editingCell.column === "title" ? (
                          <Input
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => {
                              if (skipNextBlurCommitRef.current) {
                                skipNextBlurCommitRef.current = false;
                                return;
                              }
                              commitInlineEdit(editingCell, editingValue);
                            }}
                            onKeyDown={(e) => handleInlineInputKeyDown(e, processedLinks)}
                            className={density === "compact" ? "h-7 text-xs" : "h-8"}
                          />
                        ) : (
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 truncate font-medium text-foreground hover:text-primary transition-colors"
                            onDoubleClick={(e) => {
                              e.preventDefault();
                              beginInlineEdit(link, "title");
                            }}
                            title="Duplo clique para editar titulo"
                          >
                            <span className="truncate">{link.title || link.url}</span>
                            <ExternalLink className="h-3 w-3 shrink-0 opacity-40" />
                          </a>
                        )}
                        <p className={`${TEXT_XS_CLASS} mt-0.5 truncate text-muted-foreground`}>
                          {getHostname(link.url)}
                        </p>
                      </div>
                    )}

                    {columnId === "description" && (
                      <div>
                        <p className={`truncate text-muted-foreground ${TEXT_XS_CLASS}`}>{link.description || "-"}</p>
                        {link.notes && (
                          <span className={`mt-0.5 inline-flex items-center gap-0.5 ${TEXT_XS_CLASS} text-muted-foreground`} title={link.notes}>
                            <StickyNote className="h-3 w-3" />
                            Nota
                          </span>
                        )}
                      </div>
                    )}

                    {columnId === "category" && (
                      editingCell?.id === link.id && editingCell.column === "category" ? (
                        <Input
                          autoFocus
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => {
                            if (skipNextBlurCommitRef.current) {
                              skipNextBlurCommitRef.current = false;
                              return;
                            }
                            commitInlineEdit(editingCell, editingValue);
                          }}
                          onKeyDown={(e) => handleInlineInputKeyDown(e, processedLinks)}
                          className={density === "compact" ? "h-7 text-xs" : "h-8"}
                        />
                      ) : link.category ? (
                        <Badge
                          variant="secondary"
                          className={COMPACT_BADGE_CLASS}
                          onDoubleClick={() => beginInlineEdit(link, "category")}
                          title="Duplo clique para editar categoria"
                        >
                          {link.category}
                        </Badge>
                      ) : (
                        <button
                          type="button"
                          onClick={() => beginInlineEdit(link, "category")}
                          className={`${TEXT_XS_CLASS} text-muted-foreground hover:text-foreground`}
                        >
                          -
                        </button>
                      )
                    )}

                    {columnId === "tags" && (
                      editingCell?.id === link.id && editingCell.column === "tags" ? (
                        <Input
                          autoFocus
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => {
                            if (skipNextBlurCommitRef.current) {
                              skipNextBlurCommitRef.current = false;
                              return;
                            }
                            commitInlineEdit(editingCell, editingValue);
                          }}
                          onKeyDown={(e) => handleInlineInputKeyDown(e, processedLinks)}
                          className={density === "compact" ? "h-7 text-xs" : "h-8"}
                          placeholder="tag1, tag2"
                        />
                      ) : (
                        <div
                          className="flex max-w-full cursor-text flex-wrap gap-1"
                          onDoubleClick={() => beginInlineEdit(link, "tags")}
                          title="Duplo clique para editar tags"
                        >
                          {link.tags.length > 0 ? (
                            link.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline" className={COMPACT_BADGE_CLASS}>{tag}</Badge>
                            ))
                          ) : (
                            <span className={`${TEXT_XS_CLASS} text-muted-foreground`}>-</span>
                          )}
                          {link.tags.length > 3 && (
                            <span className={`${TEXT_XS_CLASS} text-muted-foreground`}>+{link.tags.length - 3}</span>
                          )}
                        </div>
                      )
                    )}

                    {columnId === "status" && (
                      <Select
                        value={link.status}
                        onValueChange={(value: LinkItem["status"]) => onUpdateLink(link.id, { status: value })}
                      >
                        <SelectTrigger className={`${density === "compact" ? "h-7 text-xs min-w-[116px]" : "h-8 min-w-[132px]"}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="backlog">Backlog</SelectItem>
                          <SelectItem value="in_progress">Em progresso</SelectItem>
                          <SelectItem value="done">Concluido</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {columnId === "priority" && (
                      <Select
                        value={link.priority}
                        onValueChange={(value: LinkItem["priority"]) => onUpdateLink(link.id, { priority: value })}
                      >
                        <SelectTrigger className={`${density === "compact" ? "h-7 text-xs min-w-[116px]" : "h-8 min-w-[132px]"}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Baixa</SelectItem>
                          <SelectItem value="medium">Media</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {columnId === "dueDate" && (
                      editingCell?.id === link.id && editingCell.column === "dueDate" ? (
                        <Input
                          autoFocus
                          type="date"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => {
                            if (skipNextBlurCommitRef.current) {
                              skipNextBlurCommitRef.current = false;
                              return;
                            }
                            commitInlineEdit(editingCell, editingValue);
                          }}
                          onKeyDown={(e) => handleInlineInputKeyDown(e, processedLinks)}
                          className={density === "compact" ? "h-7 text-xs" : "h-8"}
                        />
                      ) : (
                        <button
                          type="button"
                          className={`${TEXT_XS_CLASS} whitespace-nowrap text-muted-foreground hover:text-foreground`}
                          onClick={() => beginInlineEdit(link, "dueDate")}
                          title="Clique para editar prazo"
                        >
                          {link.dueDate
                            ? new Date(link.dueDate).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "short",
                              })
                            : "-"}
                        </button>
                      )
                    )}
                  </td>
                ))}

                {/* Actions */}
                <td className={`sticky right-0 z-10 bg-background/95 text-right shadow-[-6px_0_10px_-8px_hsl(var(--border))] backdrop-blur supports-[backdrop-filter]:bg-background/85 ${density === "compact" ? "px-3 py-2" : "px-4 py-3"}`}>
                  <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={ICON_BTN_MD_CLASS}
                      onClick={() => onToggleFavorite(link.id)}
                    >
                      <Star
                        className={`h-3.5 w-3.5 ${link.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                      />
                    </Button>
                    <Button variant="ghost" size="icon" className={ICON_BTN_MD_CLASS} onClick={() => onEdit(link)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className={`${ICON_BTN_MD_CLASS} text-destructive`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir link?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O link será removido permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => onDelete(link.id)}
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
