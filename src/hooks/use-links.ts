import { useState, useEffect, useCallback } from "react";
import type { LinkItem, Category } from "@/types/link";

const LINKS_KEY = "link-repo-links";
const CATEGORIES_KEY = "link-repo-categories";

const defaultCategories: Category[] = [
  { id: "trabalho", name: "Trabalho" },
  { id: "estudos", name: "Estudos" },
  { id: "lazer", name: "Lazer" },
];

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

export function useLinks() {
  const [links, setLinks] = useState<LinkItem[]>(() =>
    loadFromStorage(LINKS_KEY, [])
  );
  const [categories, setCategories] = useState<Category[]>(() =>
    loadFromStorage(CATEGORIES_KEY, defaultCategories)
  );

  useEffect(() => {
    localStorage.setItem(LINKS_KEY, JSON.stringify(links));
  }, [links]);

  useEffect(() => {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  }, [categories]);

  const addLink = useCallback((link: Omit<LinkItem, "id" | "createdAt">) => {
    const newLink: LinkItem = {
      ...link,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setLinks((prev) => [newLink, ...prev]);
  }, []);

  const updateLink = useCallback((id: string, data: Partial<LinkItem>) => {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...data } : l)));
  }, []);

  const deleteLink = useCallback((id: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, isFavorite: !l.isFavorite } : l))
    );
  }, []);

  const addCategory = useCallback((name: string) => {
    setCategories((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name },
    ]);
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const renameCategory = useCallback((id: string, name: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name } : c))
    );
  }, []);

  const allTags = Array.from(new Set(links.flatMap((l) => l.tags)));

  return {
    links,
    categories,
    allTags,
    addLink,
    updateLink,
    deleteLink,
    toggleFavorite,
    addCategory,
    deleteCategory,
    renameCategory,
  };
}
