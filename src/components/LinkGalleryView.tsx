import { useCallback, useEffect, useMemo, useState } from "react";
import { Star, ExternalLink, Pencil, Trash2, Flame, Sparkles, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FaviconWithFallback } from "@/components/FaviconWithFallback";
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
import { ICON_BTN_MD_CLASS, TEXT_XS_CLASS } from "@/lib/utils";
import type { LinkItem, Category } from "@/types/link";

interface LinkGalleryViewProps {
  links: LinkItem[];
  categories?: Category[];
  onToggleFavorite: (id: string) => void;
  onEdit: (link: LinkItem) => void;
  onDelete: (id: string) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string, shiftKey?: boolean) => void;
}

type CatalogSort = "newest" | "alphabetical" | "favorites" | "priority";
type CurationFilter = "all" | "featured" | "new" | "trending";
type TagMatchMode = "or" | "and";
type DueFilter = "all" | "overdue" | "today" | "7d" | "30d" | "no_due";

const GALLERY_FILTERS_STORAGE_KEY = "gallery-catalog-filters-v1";
const GALLERY_PRESETS_STORAGE_KEY = "gallery-catalog-presets-v1";
const GALLERY_CURATION_RULES_STORAGE_KEY = "gallery-curation-rules-v1";

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

type GalleryCatalogPreset = {
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

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function LinkGalleryView({
  links,
  categories,
  onToggleFavorite,
  onEdit,
  onDelete,
  selectedIds,
  onToggleSelect,
}: LinkGalleryViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagMatchMode, setTagMatchMode] = useState<TagMatchMode>("or");
  const [statusFilter, setStatusFilter] = useState<"all" | LinkItem["status"]>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | LinkItem["priority"]>("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  const [curationFilter, setCurationFilter] = useState<CurationFilter>("all");
  const [sortBy, setSortBy] = useState<CatalogSort>("newest");
  const [presets, setPresets] = useState<GalleryCatalogPreset[]>([]);
  const [activePresetName, setActivePresetName] = useState<string>("none");
  const [showCurationRules, setShowCurationRules] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [curationRules, setCurationRules] = useState<CurationRules>(DEFAULT_CURATION_RULES);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(GALLERY_FILTERS_STORAGE_KEY);
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
        GALLERY_FILTERS_STORAGE_KEY,
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
      const raw = localStorage.getItem(GALLERY_PRESETS_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Array<Partial<GalleryCatalogPreset>>;
      if (!Array.isArray(parsed)) return;

      const valid = parsed
        .filter((item): item is GalleryCatalogPreset => (
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
      localStorage.setItem(GALLERY_PRESETS_STORAGE_KEY, JSON.stringify(presets));
    } catch {
      // Ignore persistence errors.
    }
  }, [presets]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(GALLERY_CURATION_RULES_STORAGE_KEY);
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
      localStorage.setItem(GALLERY_CURATION_RULES_STORAGE_KEY, JSON.stringify(curationRules));
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
    setActivePresetName(name);
  };

  const saveCurrentPreset = () => {
    const suggested = activePresetName !== "none" ? activePresetName : "Minha vista";
    const name = window.prompt("Nome da vista:", suggested)?.trim();
    if (!name) return;

    const nextPreset: GalleryCatalogPreset = {
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

    const nextPreset: GalleryCatalogPreset = {
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
    const nextPreset: GalleryCatalogPreset = {
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

  const isNew = useCallback((link: LinkItem) => {
    const created = new Date(link.createdAt);
    if (Number.isNaN(created.getTime())) return false;
    const now = Date.now();
    const threshold = Math.max(1, curationRules.newDays) * 24 * 60 * 60 * 1000;
    return now - created.getTime() <= threshold;
  }, [curationRules.newDays]);

  const isTrending = useCallback((link: LinkItem) => {
    const created = new Date(link.createdAt);
    const recencyMs = Math.max(1, curationRules.trendingRecentDays) * 24 * 60 * 60 * 1000;
    const recent = !Number.isNaN(created.getTime()) && (Date.now() - created.getTime() <= recencyMs);
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

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const link of links) {
      const key = link.category || "Sem categoria";
      map.set(key, (map.get(key) ?? 0) + 1);
    }

    const preferredOrder = (categories ?? []).map((cat) => cat.name);
    return Array.from(map.entries())
      .sort(([a], [b]) => {
        const ai = preferredOrder.indexOf(a);
        const bi = preferredOrder.indexOf(b);
        if (ai !== -1 || bi !== -1) {
          return (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi);
        }
        return a.localeCompare(b);
      });
  }, [links, categories]);

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
  }, [links, selectedCategory, selectedTags, tagMatchMode, statusFilter, priorityFilter, curationFilter, sortBy, matchesDueFilter, isFeatured, isNew, isTrending]);

  const hasActiveFilters = selectedCategory !== "all" || selectedTags.length > 0 || statusFilter !== "all" || priorityFilter !== "all" || dueFilter !== "all" || curationFilter !== "all" || sortBy !== "newest";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card/50 p-3">
        <div className="mb-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Badge variant="secondary" className="text-[11px]">
            Catalogo: {catalogLinks.length}/{links.length}
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

      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
      {catalogLinks.map((link) => {
        const isSelected = selectedIds?.has(link.id);
        const showNew = isNew(link);
        const showFeatured = isFeatured(link);
        const showTrending = isTrending(link);
        return (
          <div
            key={link.id}
            className={`group relative break-inside-avoid rounded-xl overflow-hidden border bg-card shadow-sm hover:shadow-lg transition-all duration-300 ${
              isSelected ? "ring-2 ring-primary border-primary" : ""
            }`}
          >
            {/* Selection checkbox */}
            {onToggleSelect && (
              <button
                onClick={(e) => onToggleSelect(link.id, e.shiftKey)}
                className={`absolute top-2 left-2 z-20 h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
                  isSelected
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-background/80 border-muted-foreground/40 opacity-0 group-hover:opacity-100"
                }`}
              >
                {isSelected && (
                  <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            )}

            {/* Cover image */}
            {link.ogImage ? (
              <div className="w-full overflow-hidden bg-muted">
                <img
                  src={link.ogImage}
                  alt=""
                  loading="lazy"
                  className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  style={{ minHeight: "160px", maxHeight: "320px" }}
                  onError={(e) => {
                    (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                  }}
                />
              </div>
            ) : (
              <div className="w-full h-32 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                <FaviconWithFallback url={link.url} favicon={link.favicon} size={48} />
              </div>
            )}

            {/* Favorite badge */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/70 backdrop-blur-sm hover:bg-background/90 z-10"
              onClick={() => onToggleFavorite(link.id)}
            >
              <Star
                className={`h-4 w-4 ${link.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
              />
            </Button>

            {(showNew || showFeatured || showTrending) && (
              <div className="absolute bottom-2 left-2 z-10 flex flex-wrap gap-1">
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

            {/* Content */}
            <div className="p-3.5">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 font-semibold text-sm text-foreground hover:text-primary transition-colors line-clamp-2"
              >
                {link.title || link.url}
                <ExternalLink className="h-3 w-3 shrink-0 opacity-40" />
              </a>

              {link.description && (
                <p className={`mt-1 ${TEXT_XS_CLASS} text-muted-foreground line-clamp-2`}>
                  {link.description}
                </p>
              )}

              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <FaviconWithFallback url={link.url} favicon={link.favicon} size={12} />
                <span className="truncate">{getHostname(link.url)}</span>
              </div>

              {(link.category || link.tags.length > 0) && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {link.category && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      {link.category}
                    </Badge>
                  )}
                  {link.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      {tag}
                    </Badge>
                  ))}
                  {link.tags.length > 2 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      +{link.tags.length - 2}
                    </Badge>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="mt-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        O link será movido para a lixeira.
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
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
