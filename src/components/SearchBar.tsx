import { useState, forwardRef } from "react";
import { Search, X, ChevronDown, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { SearchFilters, DatePeriod, SortOption, DueDateFilter, LinkStatus, LinkPriority, Category } from "@/types/link";
import { cn, TEXT_XS_CLASS } from "@/lib/utils";

interface SearchBarProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  categories: Category[];
  allTags: string[];
  searching?: boolean;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar({
  filters,
  onFiltersChange,
  categories,
  allTags,
  searching = false,
}, ref) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedTagForAdd, setSelectedTagForAdd] = useState<string>("");

  const handleQueryChange = (query: string) => {
    onFiltersChange({ ...filters, query });
  };

  const handleCategoryChange = (category: string) => {
    onFiltersChange({
      ...filters,
      category: category === "all" ? null : category,
    });
  };

  const handleAddTag = (tag: string) => {
    if (tag && !filters.tags.includes(tag)) {
      onFiltersChange({
        ...filters,
        tags: [...filters.tags, tag],
      });
      setSelectedTagForAdd("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    onFiltersChange({
      ...filters,
      tags: filters.tags.filter((t) => t !== tag),
    });
  };

  const handlePeriodChange = (period: string) => {
    onFiltersChange({
      ...filters,
      period: period as DatePeriod,
    });
  };

  const handleSortChange = (sort: string) => {
    onFiltersChange({
      ...filters,
      sort: sort as SortOption,
    });
  };

  const handleFavoritesToggle = (checked: boolean) => {
    onFiltersChange({
      ...filters,
      favoritesOnly: checked,
    });
  };

  const handleStatusChange = (status: string) => {
    onFiltersChange({
      ...filters,
      status: status as LinkStatus | "all",
    });
  };

  const handlePriorityChange = (priority: string) => {
    onFiltersChange({
      ...filters,
      priority: priority as LinkPriority | "all",
    });
  };

  const handleDueDateChange = (dueDate: string) => {
    onFiltersChange({
      ...filters,
      dueDate: dueDate as DueDateFilter,
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      query: "",
      category: null,
      tags: [],
      period: "all",
      sort: "manual",
      favoritesOnly: false,
      status: "all",
      priority: "all",
      dueDate: "all",
    });
    setShowAdvanced(false);
  };

  const hasActiveFilters =
    filters.query ||
    filters.category ||
    filters.tags.length > 0 ||
    filters.period !== "all" ||
    filters.sort !== "manual" ||
    filters.favoritesOnly ||
    filters.status !== "all" ||
    filters.priority !== "all" ||
    filters.dueDate !== "all";

  const parentCategories = categories.filter((c) => !c.parentId);
  const childCategories = categories.filter((c) => c.parentId);
  const categoryOptions = parentCategories.flatMap((parent) => {
    const children = childCategories.filter((c) => c.parentId === parent.id);
    return [
      { value: parent.name, label: parent.name },
      ...children.map((child) => ({
        value: `${parent.name} / ${child.name}`,
        label: `${parent.name} / ${child.name}`,
      })),
    ];
  });

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
      {/* Main Search Input */}
      <div className="flex items-center gap-2">
        {searching ? (
          <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
        ) : (
          <Search className="h-4 w-4 text-muted-foreground" />
        )}
        <Input
          ref={ref}
          id="search-query"
          name="searchQuery"
          placeholder="Buscar por título, URL, descrição, tags... ( / )"
          value={filters.query}
          onChange={(e) => handleQueryChange(e.target.value)}
          className="flex-1"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(
            "transition-colors",
            showAdvanced && "bg-accent text-accent-foreground"
          )}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="space-y-3 border-t pt-3">
          {/* Row 1: Category + Period + Sort */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {/* Category Filter */}
            <Select
              value={filters.category || "all"}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className={`h-8 ${TEXT_XS_CLASS}`}>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Period Filter */}
            <Select value={filters.period} onValueChange={handlePeriodChange}>
              <SelectTrigger className={`h-8 ${TEXT_XS_CLASS}`}>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tempos</SelectItem>
                <SelectItem value="week">Última semana</SelectItem>
                <SelectItem value="month">Último mês</SelectItem>
                <SelectItem value="3months">Últimos 3 meses</SelectItem>
                <SelectItem value="year">Último ano</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Filter */}
            <Select value={filters.sort} onValueChange={handleSortChange}>
              <SelectTrigger className={`h-8 ${TEXT_XS_CLASS}`}>
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="newest">Mais recentes</SelectItem>
                <SelectItem value="oldest">Mais antigos</SelectItem>
                <SelectItem value="alphabetical">A-Z</SelectItem>
                <SelectItem value="favorites">Favoritos primeiro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Select value={filters.status} onValueChange={handleStatusChange}>
              <SelectTrigger className={`h-8 ${TEXT_XS_CLASS}`}>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="backlog">Backlog</SelectItem>
                <SelectItem value="in_progress">Em progresso</SelectItem>
                <SelectItem value="done">Concluído</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.priority} onValueChange={handlePriorityChange}>
              <SelectTrigger className={`h-8 ${TEXT_XS_CLASS}`}>
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas prioridades</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.dueDate} onValueChange={handleDueDateChange}>
              <SelectTrigger className={`h-8 ${TEXT_XS_CLASS}`}>
                <SelectValue placeholder="Data limite" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer data</SelectItem>
                <SelectItem value="overdue">Atrasados</SelectItem>
                <SelectItem value="today">Vence hoje</SelectItem>
                <SelectItem value="upcoming">Próximos</SelectItem>
                <SelectItem value="none">Sem data</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Row 2: Favorites Checkbox + Tag Selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="favorites-only"
                checked={filters.favoritesOnly}
                onCheckedChange={(checked) =>
                  handleFavoritesToggle(checked as boolean)
                }
              />
              <label
                htmlFor="favorites-only"
                className={`${TEXT_XS_CLASS} cursor-pointer font-medium`}
              >
                Só Favoritos
              </label>
            </div>

            {/* Tag Selector */}
            {allTags.length > 0 && (
              <Select value={selectedTagForAdd} onValueChange={handleAddTag}>
                <SelectTrigger className={`h-8 w-40 ${TEXT_XS_CLASS}`}>
                  <SelectValue placeholder="Adicionar tag..." />
                </SelectTrigger>
                <SelectContent>
                  {allTags
                    .filter((tag) => !filters.tags.includes(tag))
                    .map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        {tag}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Row 3: Selected Tags */}
          {filters.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {filters.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer gap-1"
                  onClick={() => handleRemoveTag(tag)}
                >
                  {tag}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className={TEXT_XS_CLASS}
            onClick={handleClearFilters}
          >
            Limpar filtros
          </Button>
        </div>
      )}
    </div>
  );
});
