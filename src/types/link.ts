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
}

export interface Category {
  id: string;
  name: string;
}
