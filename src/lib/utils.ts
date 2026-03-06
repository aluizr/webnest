import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { LinkItem, SearchFilters, DatePeriod } from "@/types/link";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const COMPACT_BADGE_CLASS = "text-[10px] px-1.5 py-0 h-[18px]";
export const TEXT_XS_CLASS = "text-xs";
export const ICON_BTN_SM_CLASS = "h-6 w-6";
export const ICON_BTN_MD_CLASS = "h-7 w-7";

// ✅ Filtrar e ordenar links baseado em SearchFilters
export function filterAndSortLinks(
  links: LinkItem[],
  filters: SearchFilters
): LinkItem[] {
  let result = [...links];

  // 1. Filtrar por query (título, descrição, URL, tags)
  if (filters.query.trim()) {
    const q = filters.query.toLowerCase();
    result = result.filter((link) => {
      const searchableText = [
        link.title,
        link.description,
        link.url,
        link.category,
        link.notes,
        ...link.tags,
      ]
        .join(" ")
        .toLowerCase();
      return searchableText.includes(q);
    });
  }

  // 2. Filtrar por categoria
  if (filters.category) {
    result = result.filter((link) => link.category === filters.category);
  }

  // 3. Filtrar por tags (all tags must be present)
  if (filters.tags.length > 0) {
    result = result.filter((link) =>
      filters.tags.every((tag) => link.tags.includes(tag))
    );
  }

  // 4. Filtrar por período
  if (filters.period !== "all") {
    const now = new Date();
    const periodDays: Record<DatePeriod, number> = {
      all: 0,
      week: 7,
      month: 30,
      "3months": 90,
      year: 365,
    };
    const cutoffDate = new Date(now.getTime() - periodDays[filters.period] * 24 * 60 * 60 * 1000);

    result = result.filter((link) => new Date(link.createdAt) >= cutoffDate);
  }

  // 5. Filtrar por favoritos
  if (filters.favoritesOnly) {
    result = result.filter((link) => link.isFavorite);
  }

  // 6. Ordenar
  const sortFunctions: Record<string, (a: LinkItem, b: LinkItem) => number> = {
    manual: (a, b) => (a.position ?? 0) - (b.position ?? 0),
    newest: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    oldest: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    alphabetical: (a, b) => (a.title || a.url).localeCompare(b.title || b.url),
    favorites: (a, b) => {
      if (a.isFavorite === b.isFavorite) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return a.isFavorite ? -1 : 1;
    },
  };

  result.sort(sortFunctions[filters.sort] || sortFunctions.newest);

  return result;
}
