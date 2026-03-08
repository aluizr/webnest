import { useEffect, useMemo, useState } from "react";
import { Star, ExternalLink, Pencil, Trash2, StickyNote, GripVertical, Globe, Flame, Sparkles, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { COMPACT_BADGE_CLASS, ICON_BTN_MD_CLASS, ICON_BTN_SM_CLASS, TEXT_XS_CLASS } from "@/lib/utils";
import type { LinkItem } from "@/types/link";
import type { CardSize } from "@/components/ViewSwitcher";

// --- Size-responsive config ---

const gridClasses: Record<CardSize, string> = {
  sm: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3",
  md: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4",
  lg: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-5",
};

const coverHeight: Record<CardSize, string> = {
  sm: "h-28",
  md: "h-36",
  lg: "h-44",
};

const placeholderIcon: Record<CardSize, string> = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

const titleClasses: Record<CardSize, string> = {
  sm: `${TEXT_XS_CLASS} leading-tight`,
  md: "text-sm leading-snug",
  lg: "text-base leading-snug",
};

const descLines: Record<CardSize, string> = {
  sm: "line-clamp-1 text-[10px]",
  md: `line-clamp-2 ${TEXT_XS_CLASS}`,
  lg: "line-clamp-2 text-sm",
};

const badgeClasses: Record<CardSize, string> = {
  sm: "text-[9px] px-1.5 py-0 h-4",
  md: COMPACT_BADGE_CLASS,
  lg: `${TEXT_XS_CLASS} px-2 py-0.5 h-5`,
};

const domainClasses: Record<CardSize, string> = {
  sm: "text-[10px]",
  md: "text-[11px]",
  lg: TEXT_XS_CLASS,
};

const faviconSizes: Record<CardSize, number> = { sm: 12, md: 14, lg: 16 };
const maxTags: Record<CardSize, number> = { sm: 1, md: 2, lg: 3 };
const actionBtnSize: Record<CardSize, string> = {
  sm: ICON_BTN_SM_CLASS,
  md: ICON_BTN_MD_CLASS,
  lg: "h-8 w-8",
};
const actionIconSize: Record<CardSize, string> = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
};
const padClasses: Record<CardSize, string> = {
  sm: "px-2.5 py-2",
  md: "px-3 py-2.5",
  lg: "px-4 py-3",
};

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

interface LinkCardsViewProps {
  links: LinkItem[];
  cardSize: CardSize;
  onToggleFavorite: (id: string) => void;
  onEdit: (link: LinkItem) => void;
  onDelete: (id: string) => void;
  onDragStart?: (e: React.DragEvent, link: LinkItem) => void;
  onDragOver?: (e: React.DragEvent, linkId: string) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, link: LinkItem) => void;
  draggedLinkId?: string | null;
  dropZoneId?: string | null;
  dragDirection?: "above" | "below";
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string, shiftKey?: boolean) => void;
}

type CatalogSort = "newest" | "alphabetical" | "favorites" | "priority";
type CurationFilter = "all" | "featured" | "new" | "trending";
type TagMatchMode = "or" | "and";
type DueFilter = "all" | "overdue" | "today" | "7d" | "30d" | "no_due";

const CARDS_FILTERS_STORAGE_KEY = "cards-catalog-filters-v1";

const CARDS_PRESETS_STORAGE_KEY = "cards-catalog-presets-v1";

type CardsCatalogPreset = {
  name: string;
  selectedCategory: string;
  selectedTags: string[];
  tagMatchMode: TagMatchMode;
  statusFilter: "all" | LinkItem["status"];
  priorityFilter: "all" | LinkItem["priority"];
  dueFilter: DueFilter;
  curationFilter: CurationFilter;
  sortBy: CatalogSort;
};

export function LinkCardsView({
  links,
  cardSize,
  onToggleFavorite,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDragEnd,
  onDrop,
  draggedLinkId,
  dropZoneId,
  dragDirection,
  selectedIds,
  onToggleSelect,
}: LinkCardsViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagMatchMode, setTagMatchMode] = useState<TagMatchMode>("or");
  const [statusFilter, setStatusFilter] = useState<"all" | LinkItem["status"]>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | LinkItem["priority"]>("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  const [curationFilter, setCurationFilter] = useState<CurationFilter>("all");
  const [sortBy, setSortBy] = useState<CatalogSort>("newest");
  const [presets, setPresets] = useState<CardsCatalogPreset[]>([]);
  const [activePresetName, setActivePresetName] = useState<string>("none");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CARDS_FILTERS_STORAGE_KEY);
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
    } catch {
      // Ignore invalid persisted filters and keep defaults.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        CARDS_FILTERS_STORAGE_KEY,
        JSON.stringify({
          selectedCategory,
          selectedTags,
          tagMatchMode,
          statusFilter,
          priorityFilter,
          dueFilter,
          curationFilter,
          sortBy,
        })
      );
    } catch {
      // Ignore persistence errors (private mode/quota).
    }
  }, [selectedCategory, selectedTags, tagMatchMode, statusFilter, priorityFilter, dueFilter, curationFilter, sortBy]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CARDS_PRESETS_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Array<Partial<CardsCatalogPreset>>;
      if (!Array.isArray(parsed)) return;

      const valid = parsed
        .filter((item): item is CardsCatalogPreset => (
          typeof item.name === "string" &&
          typeof item.selectedCategory === "string" &&
          Array.isArray(item.selectedTags) && item.selectedTags.every((tag) => typeof tag === "string") &&
          (item.tagMatchMode === "or" || item.tagMatchMode === "and") &&
          (item.statusFilter === "all" || item.statusFilter === "backlog" || item.statusFilter === "in_progress" || item.statusFilter === "done") &&
          (item.priorityFilter === "all" || item.priorityFilter === "low" || item.priorityFilter === "medium" || item.priorityFilter === "high") &&
          (item.dueFilter === "all" || item.dueFilter === "overdue" || item.dueFilter === "today" || item.dueFilter === "7d" || item.dueFilter === "30d" || item.dueFilter === "no_due") &&
          (item.curationFilter === "all" || item.curationFilter === "featured" || item.curationFilter === "new" || item.curationFilter === "trending") &&
          (item.sortBy === "newest" || item.sortBy === "alphabetical" || item.sortBy === "favorites" || item.sortBy === "priority")
        ));

      setPresets(valid);
    } catch {
      // Ignore invalid presets payload.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CARDS_PRESETS_STORAGE_KEY, JSON.stringify(presets));
    } catch {
      // Ignore persistence errors.
    }
  }, [presets]);

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
    setActivePresetName(name);
  };

  const saveCurrentPreset = () => {
    const suggested = activePresetName !== "none" ? activePresetName : "Minha vista";
    const name = window.prompt("Nome da vista:", suggested)?.trim();
    if (!name) return;

    const nextPreset: CardsCatalogPreset = {
      name,
      selectedCategory,
      selectedTags,
      tagMatchMode,
      statusFilter,
      priorityFilter,
      dueFilter,
      curationFilter,
      sortBy,
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

    const nextPreset: CardsCatalogPreset = {
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

  const isActivePresetDirty = activePreset
    ? (
      activePreset.selectedCategory !== selectedCategory ||
      activePreset.selectedTags.join("|") !== selectedTags.join("|") ||
      activePreset.tagMatchMode !== tagMatchMode ||
      activePreset.statusFilter !== statusFilter ||
      activePreset.priorityFilter !== priorityFilter ||
      activePreset.dueFilter !== dueFilter ||
      activePreset.curationFilter !== curationFilter ||
      activePreset.sortBy !== sortBy
    )
    : false;

  const updateActivePreset = () => {
    if (!activePreset) return;
    const nextPreset: CardsCatalogPreset = {
      name: activePreset.name,
      selectedCategory,
      selectedTags,
      tagMatchMode,
      statusFilter,
      priorityFilter,
      dueFilter,
      curationFilter,
      sortBy,
    };

    setPresets((prev) => prev.map((item) => item.name === activePreset.name ? nextPreset : item));
  };

  const dueState = (dueDate?: string | null): "none" | "overdue" | "today" | "upcoming" => {
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
  };

  const matchesDueFilter = (link: LinkItem) => {
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
  };

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

  const isNew = (link: LinkItem) => {
    const created = new Date(link.createdAt);
    if (Number.isNaN(created.getTime())) return false;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - created.getTime() <= sevenDays;
  };

  const isTrending = (link: LinkItem) => {
    const created = new Date(link.createdAt);
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const recent = !Number.isNaN(created.getTime()) && Date.now() - created.getTime() <= thirtyDays;
    return (link.isFavorite && recent) || link.tags.length >= 3;
  };

  const isFeatured = (link: LinkItem) => link.priority === "high" || (link.isFavorite && link.tags.length > 0);

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

  const catalogLinks = useMemo(() => {
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

    if (sortBy === "alphabetical") {
      next.sort((a, b) => (a.title || a.url).localeCompare(b.title || b.url));
    }
    if (sortBy === "favorites") {
      next.sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite));
    }
    if (sortBy === "priority") {
      const rank = { high: 3, medium: 2, low: 1 } as const;
      next.sort((a, b) => rank[b.priority] - rank[a.priority]);
    }
    if (sortBy === "newest") {
      next.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return next;
  }, [links, selectedCategory, selectedTags, tagMatchMode, statusFilter, priorityFilter, dueFilter, curationFilter, sortBy]);

  const visibleTags = maxTags[cardSize];
  const dragEnabled = Boolean(onDragStart);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card/50 p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-[11px]">
            Catalogo: {catalogLinks.length}/{links.length}
          </Badge>

          <Select value={activePresetName} onValueChange={applyPreset}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder="Vistas salvas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Vistas salvas</SelectItem>
              {presets.map((preset) => (
                <SelectItem key={preset.name} value={preset.name}>{preset.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

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

          <Select value={sortBy} onValueChange={(value: CatalogSort) => setSortBy(value)}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder="Ordenacao" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Mais recentes</SelectItem>
              <SelectItem value="alphabetical">A-Z</SelectItem>
              <SelectItem value="favorites">Favoritos primeiro</SelectItem>
              <SelectItem value="priority">Prioridade</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={(value: "all" | LinkItem["status"]) => setStatusFilter(value)}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
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
            <SelectTrigger className="h-8 w-[170px] text-xs">
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

        {(selectedCategory !== "all" || selectedTags.length > 0 || statusFilter !== "all" || priorityFilter !== "all" || dueFilter !== "all" || curationFilter !== "all" || sortBy !== "newest") && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Filtros ativos:</span>
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
      </div>

      <div className={`grid ${gridClasses[cardSize]}`}>
      {catalogLinks.map((link) => {
        const isDragging = draggedLinkId === link.id;
        const isDropZone = dropZoneId === link.id && draggedLinkId !== null && !isDragging;
        const isSelected = selectedIds?.has(link.id);
        const hostname = getHostname(link.url);
        const showNew = isNew(link);
        const showFeatured = isFeatured(link);
        const showTrending = isTrending(link);

        return (
          <div
            key={link.id}
            draggable={dragEnabled}
            onDragStart={(e) => onDragStart?.(e, link)}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDragOver?.(e, link.id);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDrop?.(e, link);
            }}
            onDragLeave={(e) => {
              const relatedTarget = e.relatedTarget as HTMLElement;
              if (!e.currentTarget.contains(relatedTarget)) {
                onDragLeave?.(e);
              }
            }}
            onDragEnd={(e) => onDragEnd?.(e)}
            data-card-id={link.id}
            className={`group relative rounded-xl border bg-card overflow-hidden transition-all duration-200
              ${isDragging
                ? "opacity-25 scale-[0.97] shadow-none border-dashed border-primary/40 bg-primary/5"
                : ""
              }
              ${!isDragging && dragEnabled ? "snap-animate" : ""}
              ${isDropZone
                ? "border-primary/50 bg-primary/10 shadow-lg shadow-primary/10 scale-[1.02] ring-1 ring-primary/30"
                : !isDragging
                  ? "hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 border-border/60 hover:border-border"
                  : ""
              }
              ${isSelected ? "ring-2 ring-primary border-primary" : ""}
              ${dragEnabled ? "cursor-grab active:cursor-grabbing" : ""}
            `}
          >
            {/* Drop zone indicators */}
            {isDropZone && dragDirection === "above" && (
              <div className="absolute top-0 left-2 right-2 h-[3px] bg-primary rounded-full animate-pulse shadow-[0_0_8px_hsl(var(--primary)/0.6)] z-10" />
            )}
            {isDropZone && dragDirection === "below" && (
              <div className="absolute bottom-0 left-2 right-2 h-[3px] bg-primary rounded-full animate-pulse shadow-[0_0_8px_hsl(var(--primary)/0.6)] z-10" />
            )}

            {/* Cover image area */}
            <div className={`relative ${coverHeight[cardSize]} bg-muted/40 overflow-hidden`}>
              {/* Selection checkbox */}
              {onToggleSelect && (
                <button
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggleSelect(link.id, e.shiftKey); }}
                  className={`absolute top-1.5 left-1.5 z-20 h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-black/30 backdrop-blur-sm border-white/50 opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {isSelected && (
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              )}
              {link.ogImage ? (
                <img
                  src={link.ogImage}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (e.currentTarget.parentElement as HTMLElement).classList.add("no-image");
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/60 to-muted/30">
                  <Globe className={`${placeholderIcon[cardSize]} text-muted-foreground/30`} />
                </div>
              )}

              {/* Favorite star — overlaid on cover */}
              <Button
                variant="ghost"
                size="icon"
                className={`absolute top-1.5 left-1.5 ${actionBtnSize[cardSize]} rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-all ${
                  link.isFavorite ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
                onClick={() => onToggleFavorite(link.id)}
              >
                <Star
                  className={`${actionIconSize[cardSize]} ${
                    link.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-white/80"
                  }`}
                />
              </Button>

              {/* Grip handle — overlaid on cover */}
              {dragEnabled && (
                <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className={`${actionBtnSize[cardSize]} rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center`}>
                    <GripVertical className={`${actionIconSize[cardSize]} text-white/80`} />
                  </div>
                </div>
              )}

              {/* Hover actions — overlaid bottom-right of cover */}
              <div className="absolute bottom-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center ${actionBtnSize[cardSize]} rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-colors`}
                >
                  <ExternalLink className={`${actionIconSize[cardSize]} text-white/80`} />
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`${actionBtnSize[cardSize]} rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50`}
                  onClick={() => onEdit(link)}
                >
                  <Pencil className={`${actionIconSize[cardSize]} text-white/80`} />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`${actionBtnSize[cardSize]} rounded-full bg-black/30 backdrop-blur-sm hover:bg-red-500/70`}
                    >
                      <Trash2 className={`${actionIconSize[cardSize]} text-white/80`} />
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

              {(showNew || showFeatured || showTrending) && (
                <div className="absolute bottom-1.5 left-1.5 z-10 flex flex-wrap gap-1">
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

            {/* Content section — below cover */}
            <div className={`${padClasses[cardSize]} flex flex-col gap-1.5`}>
              {/* Title */}
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${titleClasses[cardSize]} font-semibold text-foreground hover:text-primary transition-colors line-clamp-2`}
              >
                {link.title || hostname}
              </a>

              {/* Description */}
              {link.description && (
                <p className={`${descLines[cardSize]} text-muted-foreground`}>
                  {link.description}
                </p>
              )}

              {/* Domain row: favicon + hostname + notes */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <FaviconWithFallback url={link.url} favicon={link.favicon} size={faviconSizes[cardSize]} />
                <span className={`${domainClasses[cardSize]} text-muted-foreground truncate`}>
                  {hostname}
                </span>
                {link.notes && (
                  <StickyNote className="h-3 w-3 text-muted-foreground/60 shrink-0 ml-auto" />
                )}
              </div>

              {/* Tags + category */}
              {(link.category || link.tags.length > 0) && (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {link.category && (
                    <Badge variant="secondary" className={`${badgeClasses[cardSize]} font-normal`}>
                      {link.category}
                    </Badge>
                  )}
                  {link.tags.slice(0, visibleTags).map((tag) => (
                    <Badge key={tag} variant="outline" className={`${badgeClasses[cardSize]} font-normal text-muted-foreground`}>
                      #{tag}
                    </Badge>
                  ))}
                  {link.tags.length > visibleTags && (
                    <span className="text-[10px] text-muted-foreground self-center">+{link.tags.length - visibleTags}</span>
                  )}
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
