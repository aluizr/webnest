import { useCallback, useEffect, useMemo, useState } from "react";
import { Star, ExternalLink, Pencil, Trash2, StickyNote, Flame, Sparkles, Clock3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FaviconWithFallback } from "@/components/FaviconWithFallback";
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
import { COMPACT_BADGE_CLASS, ICON_BTN_SM_CLASS, TEXT_XS_CLASS } from "@/lib/utils";
import type { LinkItem } from "@/types/link";

interface LinkBoardViewProps {
  links: LinkItem[];
  onToggleFavorite: (id: string) => void;
  onUpdateLink: (id: string, data: Partial<Omit<LinkItem, "id" | "createdAt" | "position">>) => void;
  onEdit: (link: LinkItem) => void;
  onDelete: (id: string) => void;
  onMoveToStatus: (id: string, status: LinkItem["status"]) => void;
  onReorderWithinStatus: (draggedId: string, targetId: string) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string, shiftKey?: boolean) => void;
}

type BoardColumnFilter = "all" | "favorites" | "high" | "urgent";
type CatalogSort = "newest" | "alphabetical" | "favorites" | "priority";
type CurationFilter = "all" | "featured" | "new" | "trending";
type TagMatchMode = "or" | "and";
type DueFilter = "all" | "overdue" | "today" | "7d" | "30d" | "no_due";

const BOARD_FILTERS_STORAGE_KEY = "board-catalog-filters-v1";
const BOARD_PRESETS_STORAGE_KEY = "board-catalog-presets-v1";
const BOARD_CURATION_RULES_STORAGE_KEY = "board-curation-rules-v1";
const DEFAULT_COLUMN_FILTERS: Record<LinkItem["status"], BoardColumnFilter> = {
  backlog: "all",
  in_progress: "all",
  done: "all",
};

type CurationRules = {
  newDays: number;
  trendingRecentDays: number;
  trendingMinTags: number;
  featuredUseHighPriority: boolean;
  featuredFavoriteMinTags: number;
};

const DEFAULT_CURATION_RULES: CurationRules = {
  newDays: 7,
  trendingRecentDays: 30,
  trendingMinTags: 3,
  featuredUseHighPriority: true,
  featuredFavoriteMinTags: 1,
};

type BoardCatalogPreset = {
  name: string;
  selectedCategory: string;
  selectedTags: string[];
  tagMatchMode: TagMatchMode;
  statusFilter: "all" | LinkItem["status"];
  priorityFilter: "all" | LinkItem["priority"];
  dueFilter: DueFilter;
  curationFilter: CurationFilter;
  sortBy: CatalogSort;
  columnFilters: Record<LinkItem["status"], BoardColumnFilter>;
};

const statusMeta: Record<LinkItem["status"], { label: string; badgeVariant: "outline" | "secondary" | "default" }> = {
  backlog: { label: "Backlog", badgeVariant: "outline" },
  in_progress: { label: "Em progresso", badgeVariant: "secondary" },
  done: { label: "Concluído", badgeVariant: "default" },
};

export function LinkBoardView({ links, onToggleFavorite, onUpdateLink, onEdit, onDelete, onMoveToStatus, onReorderWithinStatus, selectedIds, onToggleSelect }: LinkBoardViewProps) {
  const [draggedLinkId, setDraggedLinkId] = useState<string | null>(null);
  const [dropStatus, setDropStatus] = useState<LinkItem["status"] | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagMatchMode, setTagMatchMode] = useState<TagMatchMode>("or");
  const [statusFilter, setStatusFilter] = useState<"all" | LinkItem["status"]>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | LinkItem["priority"]>("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  const [curationFilter, setCurationFilter] = useState<CurationFilter>("all");
  const [sortBy, setSortBy] = useState<CatalogSort>("newest");
  const [columnFilters, setColumnFilters] = useState<Record<LinkItem["status"], BoardColumnFilter>>(DEFAULT_COLUMN_FILTERS);
  const [presets, setPresets] = useState<BoardCatalogPreset[]>([]);
  const [activePresetName, setActivePresetName] = useState<string>("none");
  const [showCurationRules, setShowCurationRules] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [curationRules, setCurationRules] = useState<CurationRules>(DEFAULT_CURATION_RULES);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BOARD_FILTERS_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as {
        selectedCategory?: unknown;
        selectedTag?: unknown;
        selectedTags?: unknown;
        tagMatchMode?: unknown;
        statusFilter?: unknown;
        priorityFilter?: unknown;
        dueFilter?: unknown;
        curationFilter?: unknown;
        sortBy?: unknown;
        columnFilters?: Partial<Record<LinkItem["status"], unknown>>;
      };

      if (typeof parsed.selectedCategory === "string") setSelectedCategory(parsed.selectedCategory);
      if (Array.isArray(parsed.selectedTags) && parsed.selectedTags.every((item) => typeof item === "string")) {
        setSelectedTags(parsed.selectedTags);
      } else if (typeof parsed.selectedTag === "string" && parsed.selectedTag !== "all") {
        setSelectedTags([parsed.selectedTag]);
      }

      if (parsed.tagMatchMode === "or" || parsed.tagMatchMode === "and") {
        setTagMatchMode(parsed.tagMatchMode);
      }

      if (parsed.statusFilter === "all" || parsed.statusFilter === "backlog" || parsed.statusFilter === "in_progress" || parsed.statusFilter === "done") {
        setStatusFilter(parsed.statusFilter);
      }

      if (parsed.priorityFilter === "all" || parsed.priorityFilter === "low" || parsed.priorityFilter === "medium" || parsed.priorityFilter === "high") {
        setPriorityFilter(parsed.priorityFilter);
      }

      if (parsed.dueFilter === "all" || parsed.dueFilter === "overdue" || parsed.dueFilter === "today" || parsed.dueFilter === "7d" || parsed.dueFilter === "30d" || parsed.dueFilter === "no_due") {
        setDueFilter(parsed.dueFilter);
      }

      if (parsed.curationFilter === "all" || parsed.curationFilter === "featured" || parsed.curationFilter === "new" || parsed.curationFilter === "trending") {
        setCurationFilter(parsed.curationFilter);
      }

      if (parsed.sortBy === "newest" || parsed.sortBy === "alphabetical" || parsed.sortBy === "favorites" || parsed.sortBy === "priority") {
        setSortBy(parsed.sortBy);
      }

      const cf = parsed.columnFilters;
      if (cf && typeof cf === "object") {
        const normalize = (value: unknown): BoardColumnFilter => {
          if (value === "favorites" || value === "high" || value === "urgent") return value;
          return "all";
        };

        setColumnFilters({
          backlog: normalize(cf.backlog),
          in_progress: normalize(cf.in_progress),
          done: normalize(cf.done),
        });
      }
    } catch {
      // Ignore invalid persisted filters and keep defaults.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        BOARD_FILTERS_STORAGE_KEY,
        JSON.stringify({
          selectedCategory,
          selectedTags,
          tagMatchMode,
          statusFilter,
          priorityFilter,
          dueFilter,
          curationFilter,
          sortBy,
          columnFilters,
        })
      );
    } catch {
      // Ignore persistence errors (private mode/quota).
    }
  }, [selectedCategory, selectedTags, tagMatchMode, statusFilter, priorityFilter, dueFilter, curationFilter, sortBy, columnFilters]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BOARD_PRESETS_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Array<Partial<BoardCatalogPreset>>;
      if (!Array.isArray(parsed)) return;

      const normalizeFilter = (value: unknown): BoardColumnFilter => {
        if (value === "favorites" || value === "high" || value === "urgent") return value;
        return "all";
      };

      const valid = parsed
        .filter((item): item is BoardCatalogPreset => (
          typeof item.name === "string" &&
          typeof item.selectedCategory === "string" &&
          Array.isArray(item.selectedTags) && item.selectedTags.every((tag) => typeof tag === "string") &&
          (item.tagMatchMode === "or" || item.tagMatchMode === "and") &&
          (item.statusFilter === "all" || item.statusFilter === "backlog" || item.statusFilter === "in_progress" || item.statusFilter === "done") &&
          (item.priorityFilter === "all" || item.priorityFilter === "low" || item.priorityFilter === "medium" || item.priorityFilter === "high") &&
          (item.dueFilter === "all" || item.dueFilter === "overdue" || item.dueFilter === "today" || item.dueFilter === "7d" || item.dueFilter === "30d" || item.dueFilter === "no_due") &&
          (item.curationFilter === "all" || item.curationFilter === "featured" || item.curationFilter === "new" || item.curationFilter === "trending") &&
          (item.sortBy === "newest" || item.sortBy === "alphabetical" || item.sortBy === "favorites" || item.sortBy === "priority") &&
          item.columnFilters !== undefined
        ))
        .map((item) => ({
          ...item,
          columnFilters: {
            backlog: normalizeFilter(item.columnFilters?.backlog),
            in_progress: normalizeFilter(item.columnFilters?.in_progress),
            done: normalizeFilter(item.columnFilters?.done),
          },
        }));

      setPresets(valid);
    } catch {
      // Ignore invalid presets payload.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(BOARD_PRESETS_STORAGE_KEY, JSON.stringify(presets));
    } catch {
      // Ignore persistence errors.
    }
  }, [presets]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BOARD_CURATION_RULES_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<CurationRules>;
      setCurationRules({
        newDays: Math.max(1, Number(parsed.newDays ?? DEFAULT_CURATION_RULES.newDays)),
        trendingRecentDays: Math.max(1, Number(parsed.trendingRecentDays ?? DEFAULT_CURATION_RULES.trendingRecentDays)),
        trendingMinTags: Math.max(1, Number(parsed.trendingMinTags ?? DEFAULT_CURATION_RULES.trendingMinTags)),
        featuredUseHighPriority: parsed.featuredUseHighPriority !== false,
        featuredFavoriteMinTags: Math.max(0, Number(parsed.featuredFavoriteMinTags ?? DEFAULT_CURATION_RULES.featuredFavoriteMinTags)),
      });
    } catch {
      // Ignore invalid rules payload.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(BOARD_CURATION_RULES_STORAGE_KEY, JSON.stringify(curationRules));
    } catch {
      // Ignore persistence errors.
    }
  }, [curationRules]);

  const applyPreset = (name: string) => {
    if (name === "none") {
      setActivePresetName("none");
      return;
    }

    const preset = presets.find((item) => item.name === name);
    if (!preset) return;

    setSelectedCategory(preset.selectedCategory);
    setSelectedTags(preset.selectedTags);
    setTagMatchMode(preset.tagMatchMode);
    setStatusFilter(preset.statusFilter);
    setPriorityFilter(preset.priorityFilter);
    setDueFilter(preset.dueFilter);
    setCurationFilter(preset.curationFilter);
    setSortBy(preset.sortBy);
    setColumnFilters(preset.columnFilters);
    setActivePresetName(name);
  };

  const saveCurrentPreset = () => {
    const suggested = activePresetName !== "none" ? activePresetName : "Minha vista";
    const name = window.prompt("Nome da vista:", suggested)?.trim();
    if (!name) return;

    const nextPreset: BoardCatalogPreset = {
      name,
      selectedCategory,
      selectedTags,
      tagMatchMode,
      statusFilter,
      priorityFilter,
      dueFilter,
      curationFilter,
      sortBy,
      columnFilters,
    };

    setPresets((prev) => {
      const withoutSameName = prev.filter((item) => item.name !== name);
      return [...withoutSameName, nextPreset].sort((a, b) => a.name.localeCompare(b.name));
    });
    setActivePresetName(name);
  };

  const deleteActivePreset = () => {
    if (activePresetName === "none") return;
    setPresets((prev) => prev.filter((item) => item.name !== activePresetName));
    setActivePresetName("none");
  };

  const duplicateActivePreset = () => {
    if (!activePreset) return;
    const suggested = `${activePreset.name} copia`;
    const name = window.prompt("Duplicar vista como:", suggested)?.trim();
    if (!name) return;
    if (presets.some((item) => item.name === name)) {
      window.alert("Ja existe uma vista com esse nome.");
      return;
    }

    const nextPreset: BoardCatalogPreset = {
      ...activePreset,
      name,
    };

    setPresets((prev) => [...prev, nextPreset].sort((a, b) => a.name.localeCompare(b.name)));
    setActivePresetName(name);
  };

  const renameActivePreset = () => {
    if (!activePreset) return;
    const name = window.prompt("Novo nome da vista:", activePreset.name)?.trim();
    if (!name || name === activePreset.name) return;
    if (presets.some((item) => item.name === name)) {
      window.alert("Ja existe uma vista com esse nome.");
      return;
    }

    setPresets((prev) => prev
      .map((item) => item.name === activePreset.name ? { ...item, name } : item)
      .sort((a, b) => a.name.localeCompare(b.name))
    );
    setActivePresetName(name);
  };

  const activePreset = activePresetName === "none"
    ? undefined
    : presets.find((item) => item.name === activePresetName);

  const isSameColumnFilters = (a: Record<LinkItem["status"], BoardColumnFilter>, b: Record<LinkItem["status"], BoardColumnFilter>) => (
    a.backlog === b.backlog &&
    a.in_progress === b.in_progress &&
    a.done === b.done
  );

  const isActivePresetDirty = activePreset
    ? (
      activePreset.selectedCategory !== selectedCategory ||
      activePreset.selectedTags.join("|") !== selectedTags.join("|") ||
      activePreset.tagMatchMode !== tagMatchMode ||
      activePreset.statusFilter !== statusFilter ||
      activePreset.priorityFilter !== priorityFilter ||
      activePreset.dueFilter !== dueFilter ||
      activePreset.curationFilter !== curationFilter ||
      activePreset.sortBy !== sortBy ||
      !isSameColumnFilters(activePreset.columnFilters, columnFilters)
    )
    : false;

  const updateActivePreset = () => {
    if (!activePreset) return;
    const nextPreset: BoardCatalogPreset = {
      name: activePreset.name,
      selectedCategory,
      selectedTags,
      tagMatchMode,
      statusFilter,
      priorityFilter,
      dueFilter,
      curationFilter,
      sortBy,
      columnFilters,
    };

    setPresets((prev) => prev.map((item) => item.name === activePreset.name ? nextPreset : item));
  };

  const isNew = useCallback((link: LinkItem) => {
    const created = new Date(link.createdAt);
    if (Number.isNaN(created.getTime())) return false;
    const threshold = Math.max(1, curationRules.newDays) * 24 * 60 * 60 * 1000;
    return Date.now() - created.getTime() <= threshold;
  }, [curationRules.newDays]);

  const isTrending = useCallback((link: LinkItem) => {
    const created = new Date(link.createdAt);
    const recencyMs = Math.max(1, curationRules.trendingRecentDays) * 24 * 60 * 60 * 1000;
    const recent = !Number.isNaN(created.getTime()) && Date.now() - created.getTime() <= recencyMs;
    return (link.isFavorite && recent) || link.tags.length >= Math.max(1, curationRules.trendingMinTags);
  }, [curationRules.trendingMinTags, curationRules.trendingRecentDays]);

  const isFeatured = useCallback((link: LinkItem) => (
    (curationRules.featuredUseHighPriority && link.priority === "high") ||
    (link.isFavorite && link.tags.length >= Math.max(0, curationRules.featuredFavoriteMinTags))
  ), [curationRules.featuredFavoriteMinTags, curationRules.featuredUseHighPriority]);

  const dueState = useCallback((dueDate?: string | null): "none" | "overdue" | "today" | "upcoming" => {
    if (!dueDate) return "none";
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) return "none";

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (due < todayStart) return "overdue";
    if (due >= todayStart && due < tomorrow) return "today";
    return "upcoming";
  }, []);

  const applyColumnFilter = useCallback((items: LinkItem[], filter: BoardColumnFilter) => {
    if (filter === "favorites") return items.filter((link) => link.isFavorite);
    if (filter === "high") return items.filter((link) => link.priority === "high");
    if (filter === "urgent") {
      return items.filter((link) => {
        const state = dueState(link.dueDate);
        return state === "overdue" || state === "today";
      });
    }
    return items;
  }, [dueState]);

  const matchesDueFilter = useCallback((link: LinkItem) => {
    if (dueFilter === "all") return true;
    if (dueFilter === "no_due") return !link.dueDate;

    const state = dueState(link.dueDate);
    if (dueFilter === "overdue") return state === "overdue";
    if (dueFilter === "today") return state === "today";

    if (!link.dueDate) return false;
    const due = new Date(link.dueDate);
    if (Number.isNaN(due.getTime())) return false;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.ceil((due.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
    if (dueFilter === "7d") return diffDays >= 0 && diffDays <= 7;
    if (dueFilter === "30d") return diffDays >= 0 && diffDays <= 30;
    return true;
  }, [dueFilter, dueState]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]);
  };

  const clearSingleFilter = (kind: "category" | "status" | "priority" | "due" | "curation" | "sort" | "tags") => {
    if (kind === "category") setSelectedCategory("all");
    if (kind === "status") setStatusFilter("all");
    if (kind === "priority") setPriorityFilter("all");
    if (kind === "due") setDueFilter("all");
    if (kind === "curation") setCurationFilter("all");
    if (kind === "sort") setSortBy("newest");
    if (kind === "tags") setSelectedTags([]);
  };

  const startInlineTitleEdit = (link: LinkItem) => {
    setEditingTitleId(link.id);
    setEditingTitle(link.title || "");
  };

  const commitInlineTitleEdit = (linkId: string) => {
    onUpdateLink(linkId, { title: editingTitle.trim() });
    setEditingTitleId(null);
    setEditingTitle("");
  };

  const cancelInlineTitleEdit = () => {
    setEditingTitleId(null);
    setEditingTitle("");
  };

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const link of links) {
      const key = link.category || "Sem categoria";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [links]);

  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const link of links) {
      for (const tag of link.tags) {
        map.set(tag, (map.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20);
  }, [links]);

  const baseLinks = useMemo(() => {
    let next = [...links];

    if (selectedCategory !== "all") {
      if (selectedCategory === "Sem categoria") {
        next = next.filter((link) => !link.category);
      } else {
        next = next.filter((link) => link.category === selectedCategory);
      }
    }

    if (selectedTags.length > 0) {
      if (tagMatchMode === "or") {
        next = next.filter((link) => selectedTags.some((tag) => link.tags.includes(tag)));
      } else {
        next = next.filter((link) => selectedTags.every((tag) => link.tags.includes(tag)));
      }
    }

    if (statusFilter !== "all") {
      next = next.filter((link) => link.status === statusFilter);
    }

    if (priorityFilter !== "all") {
      next = next.filter((link) => link.priority === priorityFilter);
    }

    next = next.filter(matchesDueFilter);

    if (curationFilter === "featured") {
      next = next.filter((link) => isFeatured(link));
    }
    if (curationFilter === "new") {
      next = next.filter((link) => isNew(link));
    }
    if (curationFilter === "trending") {
      next = next.filter((link) => isTrending(link));
    }

    return next;
  }, [links, selectedCategory, selectedTags, tagMatchMode, statusFilter, priorityFilter, curationFilter, matchesDueFilter, isFeatured, isNew, isTrending]);

  const sortBySelection = useCallback((items: LinkItem[]) => {
    const next = [...items];

    if (sortBy === "alphabetical") {
      next.sort((a, b) => (a.title || a.url).localeCompare(b.title || b.url));
      return next;
    }
    if (sortBy === "favorites") {
      next.sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite));
      return next;
    }
    if (sortBy === "priority") {
      const rank = { high: 3, medium: 2, low: 1 } as const;
      next.sort((a, b) => rank[b.priority] - rank[a.priority]);
      return next;
    }
    if (sortBy === "newest") {
      next.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return next;
    }

    return next.sort((a, b) => (a.positionInStatus ?? a.position ?? 0) - (b.positionInStatus ?? b.position ?? 0));
  }, [sortBy]);

  // Agrupar links por status
  const columns = useMemo(() => {
    return (["backlog", "in_progress", "done"] as LinkItem["status"][]).map((statusKey) => ({
      key: statusKey,
      name: statusMeta[statusKey].label,
      badgeVariant: statusMeta[statusKey].badgeVariant,
      links: applyColumnFilter(
        sortBySelection(baseLinks.filter((link) => link.status === statusKey)),
        columnFilters[statusKey]
      ),
      total: baseLinks.filter((link) => link.status === statusKey).length,
      filter: columnFilters[statusKey],
    }));
  }, [baseLinks, columnFilters, applyColumnFilter, sortBySelection]);

  const hasColumnFilters = Object.values(columnFilters).some((filter) => filter !== "all");
  const hasActiveFilters = selectedCategory !== "all" || selectedTags.length > 0 || statusFilter !== "all" || priorityFilter !== "all" || dueFilter !== "all" || curationFilter !== "all" || sortBy !== "newest" || hasColumnFilters;
  const canBoardDrag = !hasActiveFilters;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card/50 p-3">
        <div className="mb-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Badge variant="secondary" className="text-[11px]">
            Catalogo: {baseLinks.length}/{links.length}
          </Badge>

          <Select value={activePresetName} onValueChange={applyPreset}>
            <SelectTrigger className="h-8 w-full sm:w-[180px] text-xs">
              <SelectValue placeholder="Vistas salvas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Vistas salvas</SelectItem>
              {presets.map((preset) => (
                <SelectItem key={preset.name} value={preset.name}>{preset.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(value: CatalogSort) => setSortBy(value)}>
            <SelectTrigger className="h-8 w-full sm:w-[180px] text-xs">
              <SelectValue placeholder="Ordenacao" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Mais recentes</SelectItem>
              <SelectItem value="alphabetical">A-Z</SelectItem>
              <SelectItem value="favorites">Favoritos primeiro</SelectItem>
              <SelectItem value="priority">Prioridade</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant={showAdvancedFilters ? "default" : "outline"}
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
          >
            {showAdvancedFilters ? "Ocultar filtros" : "Mais filtros"}
          </Button>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => {
                setSelectedCategory("all");
                setSelectedTags([]);
                setStatusFilter("all");
                setPriorityFilter("all");
                setDueFilter("all");
                setCurationFilter("all");
                setSortBy("newest");
                setColumnFilters(DEFAULT_COLUMN_FILTERS);
              }}
            >
              Limpar filtros
            </Button>
          )}
        </div>

        {hasActiveFilters && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Ativos:</span>
            {selectedCategory !== "all" && (
              <Button type="button" variant="secondary" size="sm" className="h-6 px-2 text-[11px]" onClick={() => clearSingleFilter("category")}>
                Cat: {selectedCategory} x
              </Button>
            )}
            {statusFilter !== "all" && (
              <Button type="button" variant="secondary" size="sm" className="h-6 px-2 text-[11px]" onClick={() => clearSingleFilter("status")}>
                Status: {statusFilter} x
              </Button>
            )}
            {priorityFilter !== "all" && (
              <Button type="button" variant="secondary" size="sm" className="h-6 px-2 text-[11px]" onClick={() => clearSingleFilter("priority")}>
                Prio: {priorityFilter} x
              </Button>
            )}
            {dueFilter !== "all" && (
              <Button type="button" variant="secondary" size="sm" className="h-6 px-2 text-[11px]" onClick={() => clearSingleFilter("due")}>
                Prazo: {dueFilter} x
              </Button>
            )}
            {selectedTags.length > 0 && (
              <Button type="button" variant="secondary" size="sm" className="h-6 px-2 text-[11px]" onClick={() => clearSingleFilter("tags")}>
                Tags ({selectedTags.length}, {tagMatchMode.toUpperCase()}) x
              </Button>
            )}
            {curationFilter !== "all" && (
              <Button type="button" variant="secondary" size="sm" className="h-6 px-2 text-[11px]" onClick={() => clearSingleFilter("curation")}>
                Curadoria: {curationFilter} x
              </Button>
            )}
            {sortBy !== "newest" && (
              <Button type="button" variant="secondary" size="sm" className="h-6 px-2 text-[11px]" onClick={() => clearSingleFilter("sort")}>
                Ordenacao: {sortBy} x
              </Button>
            )}
          </div>
        )}

        {showAdvancedFilters && (
          <>
            <div className="mb-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
              <Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={saveCurrentPreset}>
                Salvar vista
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                disabled={!activePreset}
                onClick={duplicateActivePreset}
              >
                Duplicar vista
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                disabled={!activePreset}
                onClick={renameActivePreset}
              >
                Renomear vista
              </Button>
              <Button
                type="button"
                variant={isActivePresetDirty ? "default" : "outline"}
                size="sm"
                className="h-8 px-2 text-xs"
                disabled={!activePreset || !isActivePresetDirty}
                onClick={updateActivePreset}
              >
                Atualizar vista
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                disabled={activePresetName === "none"}
                onClick={deleteActivePreset}
              >
                Excluir
              </Button>

              {activePreset && isActivePresetDirty && (
                <Badge variant="secondary" className="h-6 text-[10px]">
                  Alteracoes nao salvas
                </Badge>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setShowCurationRules((prev) => !prev)}
              >
                Regras curadoria
              </Button>
            </div>

            {showCurationRules && (
              <div className="mb-2 rounded-md border border-border/60 bg-background/60 p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Novo (dias)</span>
                  <Input
                    type="number"
                    min={1}
                    className="h-7 w-20 text-xs"
                    value={curationRules.newDays}
                    onChange={(e) => setCurationRules((prev) => ({ ...prev, newDays: Math.max(1, Number(e.target.value || 1)) }))}
                  />

                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Trending janela</span>
                  <Input
                    type="number"
                    min={1}
                    className="h-7 w-20 text-xs"
                    value={curationRules.trendingRecentDays}
                    onChange={(e) => setCurationRules((prev) => ({ ...prev, trendingRecentDays: Math.max(1, Number(e.target.value || 1)) }))}
                  />

                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Trending min tags</span>
                  <Input
                    type="number"
                    min={1}
                    className="h-7 w-20 text-xs"
                    value={curationRules.trendingMinTags}
                    onChange={(e) => setCurationRules((prev) => ({ ...prev, trendingMinTags: Math.max(1, Number(e.target.value || 1)) }))}
                  />
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant={curationRules.featuredUseHighPriority ? "default" : "outline"}
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => setCurationRules((prev) => ({ ...prev, featuredUseHighPriority: !prev.featuredUseHighPriority }))}
                  >
                    Alta prioridade em destaque
                  </Button>

                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Fav min tags</span>
                  <Input
                    type="number"
                    min={0}
                    className="h-7 w-20 text-xs"
                    value={curationRules.featuredFavoriteMinTags}
                    onChange={(e) => setCurationRules((prev) => ({ ...prev, featuredFavoriteMinTags: Math.max(0, Number(e.target.value || 0)) }))}
                  />
                </div>
              </div>
            )}

            <div className="mb-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
              <Select value={statusFilter} onValueChange={(value: "all" | LinkItem["status"]) => setStatusFilter(value)}>
                <SelectTrigger className="h-8 w-full sm:w-[160px] text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Status: Todos</SelectItem>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="in_progress">Em progresso</SelectItem>
                  <SelectItem value="done">Concluido</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={(value: "all" | LinkItem["priority"]) => setPriorityFilter(value)}>
                <SelectTrigger className="h-8 w-full sm:w-[170px] text-xs">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Prioridade: Todas</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>

              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Prazo:</span>
              {[
                { id: "all", label: "Todos" },
                { id: "overdue", label: "Vencido" },
                { id: "today", label: "Hoje" },
                { id: "7d", label: "7 dias" },
                { id: "30d", label: "30 dias" },
                { id: "no_due", label: "Sem prazo" },
              ].map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant={dueFilter === item.id ? "default" : "outline"}
                  size="sm"
                  className="h-6 px-2 text-[11px]"
                  onClick={() => setDueFilter(item.id as DueFilter)}
                >
                  {item.label}
                </Button>
              ))}
            </div>

            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Curadoria:</span>
              {[
                { id: "all", label: "Todos" },
                { id: "featured", label: "Destaque" },
                { id: "new", label: "Novo" },
                { id: "trending", label: "Trending" },
              ].map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant={curationFilter === item.id ? "default" : "outline"}
                  size="sm"
                  className="h-6 px-2 text-[11px]"
                  onClick={() => setCurationFilter(item.id as CurationFilter)}
                >
                  {item.label}
                </Button>
              ))}
            </div>

            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Categoria:</span>
              <Button
                type="button"
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                className="h-6 px-2 text-[11px]"
                onClick={() => setSelectedCategory("all")}
              >
                Todas
              </Button>
              {categoryCounts.slice(0, 10).map(([name, count]) => (
                <Button
                  key={name}
                  type="button"
                  variant={selectedCategory === name ? "default" : "outline"}
                  size="sm"
                  className="h-6 px-2 text-[11px]"
                  onClick={() => setSelectedCategory(name)}
                >
                  {name} ({count})
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Tags:</span>
              <Button
                type="button"
                variant={tagMatchMode === "or" ? "default" : "outline"}
                size="sm"
                className="h-6 px-2 text-[11px]"
                onClick={() => setTagMatchMode("or")}
              >
                OR
              </Button>
              <Button
                type="button"
                variant={tagMatchMode === "and" ? "default" : "outline"}
                size="sm"
                className="h-6 px-2 text-[11px]"
                onClick={() => setTagMatchMode("and")}
              >
                AND
              </Button>
              <Button
                type="button"
                variant={selectedTags.length === 0 ? "default" : "outline"}
                size="sm"
                className="h-6 px-2 text-[11px]"
                onClick={() => setSelectedTags([])}
              >
                Todas
              </Button>
              {tagCounts.slice(0, 10).map(([tag, count]) => (
                <Button
                  key={tag}
                  type="button"
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  size="sm"
                  className="h-6 px-2 text-[11px]"
                  onClick={() => toggleTag(tag)}
                >
                  #{tag} ({count})
                </Button>
              ))}
            </div>
          </>
        )}
      </div>

      {!canBoardDrag && (
        <div className="rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Drag no board pausado enquanto filtros estiverem ativos. Use "Limpar filtros" para reordenar por arrastar.
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4 -mx-3 px-3 md:-mx-6 md:px-6 snap-x">
      {columns.map((column) => {
        const allLinks = column.links;
        return (
        <div
          key={column.key}
          className={`flex-shrink-0 w-72 snap-start rounded-lg transition-colors ${
            dropStatus === column.key ? "bg-primary/5" : ""
          }`}
          onDragOver={(e) => {
            if (!canBoardDrag) return;
            e.preventDefault();
            setDropStatus(column.key);
          }}
          onDragLeave={(e) => {
            const related = e.relatedTarget as Node | null;
            if (!related || !e.currentTarget.contains(related)) {
              setDropStatus((prev) => (prev === column.key ? null : prev));
            }
          }}
          onDrop={(e) => {
            if (!canBoardDrag) {
              setDropStatus(null);
              return;
            }
            e.preventDefault();
            const droppedId = e.dataTransfer.getData("text/plain") || draggedLinkId;
            if (!droppedId) {
              setDropStatus(null);
              return;
            }
            const droppedLink = links.find((link) => link.id === droppedId);
            if (droppedLink && droppedLink.status !== column.key) {
              onMoveToStatus(droppedId, column.key);
            }
            setDraggedLinkId(null);
            setDropStatus(null);
          }}
        >
          {/* Column header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <Badge variant={column.badgeVariant} className={`${COMPACT_BADGE_CLASS} shrink-0`}>
              {column.name}
            </Badge>
            <Badge variant="secondary" className={`${COMPACT_BADGE_CLASS} ml-2 shrink-0`}>
              {allLinks.length}/{column.total}
            </Badge>
          </div>

          <div className="mb-2 flex flex-wrap gap-1 px-1">
            {[
              { id: "all", label: "Todos" },
              { id: "favorites", label: "Fav" },
              { id: "high", label: "Alta" },
              { id: "urgent", label: "Urg" },
            ].map((filter) => (
              <Button
                key={filter.id}
                type="button"
                variant={column.filter === filter.id ? "default" : "outline"}
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => setColumnFilters((prev) => ({ ...prev, [column.key]: filter.id as BoardColumnFilter }))}
              >
                {filter.label}
              </Button>
            ))}
          </div>

          {/* Column cards */}
          <div className="flex flex-col gap-2">
            {column.links.map((link) => {
              const showNew = isNew(link);
              const showFeatured = isFeatured(link);
              const showTrending = isTrending(link);

              return (
              <Card
                key={link.id}
                draggable={canBoardDrag}
                onDragStart={(e) => {
                  if (!canBoardDrag) return;
                  e.dataTransfer.setData("text/plain", link.id);
                  setDraggedLinkId(link.id);
                }}
                onDragOver={(e) => {
                  if (!canBoardDrag) return;
                  e.preventDefault();
                  e.stopPropagation();
                  setDropStatus(column.key);
                }}
                onDrop={(e) => {
                  if (!canBoardDrag) {
                    setDraggedLinkId(null);
                    setDropStatus(null);
                    return;
                  }
                  e.preventDefault();
                  e.stopPropagation();
                  const droppedId = e.dataTransfer.getData("text/plain") || draggedLinkId;
                  if (!droppedId || droppedId === link.id) {
                    setDraggedLinkId(null);
                    setDropStatus(null);
                    return;
                  }

                  const droppedLink = links.find((item) => item.id === droppedId);
                  if (!droppedLink) {
                    setDraggedLinkId(null);
                    setDropStatus(null);
                    return;
                  }

                  if (droppedLink.status === link.status) {
                    onReorderWithinStatus(droppedId, link.id);
                  } else {
                    onMoveToStatus(droppedId, link.status);
                  }

                  setDraggedLinkId(null);
                  setDropStatus(null);
                }}
                onDragEnd={() => {
                  setDraggedLinkId(null);
                  setDropStatus(null);
                }}
                className={`group relative overflow-hidden border hover:shadow-md transition-shadow ${canBoardDrag ? "cursor-grab active:cursor-grabbing" : "cursor-default"} ${
                selectedIds?.has(link.id) ? "ring-2 ring-primary border-primary" : ""
              }`}
              >
                {/* OG Image mini cover */}
                {link.ogImage && (
                  <div className="w-full h-24 overflow-hidden bg-muted">
                    <img
                      src={link.ogImage}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                )}

                <CardContent className="p-3">
                  {/* Selection checkbox */}
                  {onToggleSelect && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleSelect(link.id, e.shiftKey); }}
                      className={`absolute top-2 left-2 z-20 h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
                        selectedIds?.has(link.id)
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-background/80 border-muted-foreground/40 opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      {selectedIds?.has(link.id) && (
                        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  )}
                  <div className="flex items-start gap-2">
                    <FaviconWithFallback url={link.url} favicon={link.favicon} size={18} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      {editingTitleId === link.id ? (
                        <Input
                          autoFocus
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={() => commitInlineTitleEdit(link.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitInlineTitleEdit(link.id);
                            }
                            if (e.key === "Escape") {
                              e.preventDefault();
                              cancelInlineTitleEdit();
                            }
                          }}
                          className="h-8 text-xs"
                        />
                      ) : (
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors line-clamp-2"
                          onDoubleClick={(e) => {
                            e.preventDefault();
                            startInlineTitleEdit(link);
                          }}
                          title="Duplo clique para editar titulo"
                        >
                          {link.title || link.url}
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-40" />
                        </a>
                      )}

                      {link.description && (
                        <p className={`mt-1 ${TEXT_XS_CLASS} text-muted-foreground line-clamp-2`}>
                          {link.description}
                        </p>
                      )}

                      {/* Tags */}
                      {link.tags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {link.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))}
                          {link.tags.length > 2 && (
                            <span className="text-[10px] text-muted-foreground">+{link.tags.length - 2}</span>
                          )}
                        </div>
                      )}

                      <div className="mt-1.5 flex items-center gap-1">
                        <Select
                          value={link.status}
                          onValueChange={(value: LinkItem["status"]) => onMoveToStatus(link.id, value)}
                        >
                          <SelectTrigger className="h-6 min-w-[122px] px-2 text-[11px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="backlog">Backlog</SelectItem>
                            <SelectItem value="in_progress">Em progresso</SelectItem>
                            <SelectItem value="done">Concluido</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select
                          value={link.priority}
                          onValueChange={(value: LinkItem["priority"]) => onUpdateLink(link.id, { priority: value })}
                        >
                          <SelectTrigger className="h-6 min-w-[104px] px-2 text-[11px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Baixa</SelectItem>
                            <SelectItem value="medium">Media</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                          </SelectContent>
                        </Select>
                        {link.dueDate && (
                          <Badge
                            variant={
                              dueState(link.dueDate) === "overdue"
                                ? "destructive"
                                : dueState(link.dueDate) === "today"
                                  ? "secondary"
                                  : "outline"
                            }
                            className={COMPACT_BADGE_CLASS}
                          >
                            {new Date(link.dueDate).toLocaleDateString("pt-BR")}
                          </Badge>
                        )}
                      </div>

                      {link.notes && (
                        <span className={`inline-flex items-center gap-0.5 ${TEXT_XS_CLASS} text-muted-foreground mt-1`} title={link.notes}>
                          <StickyNote className="h-3 w-3" />
                        </span>
                      )}

                      {(showNew || showFeatured || showTrending) && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {showNew && (
                            <Badge className="h-5 border-0 bg-sky-500/95 px-1.5 text-[10px] text-white">
                              <Clock3 className="mr-1 h-3 w-3" />
                              Novo
                            </Badge>
                          )}
                          {showFeatured && (
                            <Badge className="h-5 border-0 bg-amber-500/95 px-1.5 text-[10px] text-white">
                              <Sparkles className="mr-1 h-3 w-3" />
                              Destaque
                            </Badge>
                          )}
                          {showTrending && (
                            <Badge className="h-5 border-0 bg-rose-500/95 px-1.5 text-[10px] text-white">
                              <Flame className="mr-1 h-3 w-3" />
                              Trending
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions - hover */}
                  <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-md p-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={ICON_BTN_SM_CLASS}
                      onClick={() => onToggleFavorite(link.id)}
                    >
                      <Star
                        className={`h-3 w-3 ${link.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                      />
                    </Button>
                    <Button variant="ghost" size="icon" className={ICON_BTN_SM_CLASS} onClick={() => onEdit(link)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className={`${ICON_BTN_SM_CLASS} text-destructive`}>
                          <Trash2 className="h-3 w-3" />
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
                </CardContent>
              </Card>
              );
            })}

            {allLinks.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 p-6 text-center">
                <p className={`${TEXT_XS_CLASS} text-muted-foreground`}>Nenhum link</p>
              </div>
            )}
          </div>
        </div>
        );
      })}
      </div>
    </div>
  );
}
