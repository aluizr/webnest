export interface LinkItem {
  id: string;
  url: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  isFavorite: boolean;
  favicon: string;
  ogImage: string;
  notes: string;
  createdAt: string;
  position: number; // ✅ Para drag & drop ordering
  deletedAt?: string | null; // ✅ Soft delete — null = ativo, ISO date = na lixeira
}

export interface Category {
  id: string;
  name: string;
  icon: string; // ✅ Lucide icon name (e.g., "Folder", "BookOpen", etc.)
  parentId?: string | null;
  position: number; // ✅ Ordering within the sidebar
  color?: string | null; // ✅ Hex color for visual differentiation (e.g., "#3B82F6")
}

export type SortOption = "manual" | "newest" | "oldest" | "alphabetical" | "favorites";
export type DatePeriod = "all" | "week" | "month" | "3months" | "year";
export type ViewMode = "grid" | "list" | "table" | "board" | "cards" | "gallery";

// Histórico de alterações
export type ActivityAction =
  | "link:created"
  | "link:updated"
  | "link:deleted"
  | "link:trashed"
  | "link:restored"
  | "link:favorited"
  | "link:unfavorited"
  | "link:reordered"
  | "category:created"
  | "category:deleted"
  | "category:renamed"
  | "import:completed"
  | "export:completed";

export interface ActivityLogEntry {
  id: string;
  action: ActivityAction;
  title: string;
  details?: string;
  timestamp: string;
}

export interface SearchFilters {
  query: string;
  category: string | null;
  tags: string[];
  period: DatePeriod;
  sort: SortOption;
  favoritesOnly: boolean;
}
