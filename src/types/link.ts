export interface LinkItem {
  id: string;
  url: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  isFavorite: boolean;
  favicon: string;
  createdAt: string;
  position: number; // ✅ Para drag & drop ordering
}

export interface Category {
  id: string;
  name: string;
  icon: string; // ✅ Lucide icon name (e.g., "Folder", "BookOpen", etc.)
}
