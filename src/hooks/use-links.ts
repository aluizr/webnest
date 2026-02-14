import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { LinkItem, Category } from "@/types/link";

export function useLinks() {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch links and categories on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [linksRes, catsRes] = await Promise.all([
        supabase.from("links").select("*").order("created_at", { ascending: false }),
        supabase.from("categories").select("*"),
      ]);
      if (linksRes.data) {
        setLinks(
          linksRes.data.map((r: any) => ({
            id: r.id,
            url: r.url,
            title: r.title,
            description: r.description,
            category: r.category,
            tags: r.tags || [],
            isFavorite: r.is_favorite,
            favicon: r.favicon,
            createdAt: r.created_at,
          }))
        );
      }
      if (catsRes.data) {
        setCategories(catsRes.data.map((r: any) => ({ id: r.id, name: r.name })));
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const addLink = useCallback(async (link: Omit<LinkItem, "id" | "createdAt">) => {
    const { data, error } = await supabase
      .from("links")
      .insert({
        url: link.url,
        title: link.title,
        description: link.description,
        category: link.category,
        tags: link.tags,
        is_favorite: link.isFavorite,
        favicon: link.favicon,
      })
      .select()
      .single();
    if (data && !error) {
      const newLink: LinkItem = {
        id: data.id,
        url: data.url,
        title: data.title,
        description: data.description,
        category: data.category,
        tags: data.tags || [],
        isFavorite: data.is_favorite,
        favicon: data.favicon,
        createdAt: data.created_at,
      };
      setLinks((prev) => [newLink, ...prev]);
    }
  }, []);

  const updateLink = useCallback(async (id: string, data: Partial<LinkItem>) => {
    const dbData: any = {};
    if (data.url !== undefined) dbData.url = data.url;
    if (data.title !== undefined) dbData.title = data.title;
    if (data.description !== undefined) dbData.description = data.description;
    if (data.category !== undefined) dbData.category = data.category;
    if (data.tags !== undefined) dbData.tags = data.tags;
    if (data.isFavorite !== undefined) dbData.is_favorite = data.isFavorite;
    if (data.favicon !== undefined) dbData.favicon = data.favicon;

    const { error } = await supabase.from("links").update(dbData).eq("id", id);
    if (!error) {
      setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...data } : l)));
    }
  }, []);

  const deleteLink = useCallback(async (id: string) => {
    const { error } = await supabase.from("links").delete().eq("id", id);
    if (!error) {
      setLinks((prev) => prev.filter((l) => l.id !== id));
    }
  }, []);

  const toggleFavorite = useCallback(async (id: string) => {
    const link = links.find((l) => l.id === id);
    if (!link) return;
    const newVal = !link.isFavorite;
    const { error } = await supabase.from("links").update({ is_favorite: newVal }).eq("id", id);
    if (!error) {
      setLinks((prev) =>
        prev.map((l) => (l.id === id ? { ...l, isFavorite: newVal } : l))
      );
    }
  }, [links]);

  const addCategory = useCallback(async (name: string) => {
    const { data, error } = await supabase
      .from("categories")
      .insert({ name })
      .select()
      .single();
    if (data && !error) {
      setCategories((prev) => [...prev, { id: data.id, name: data.name }]);
    }
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (!error) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
    }
  }, []);

  const renameCategory = useCallback(async (id: string, name: string) => {
    const { error } = await supabase.from("categories").update({ name }).eq("id", id);
    if (!error) {
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name } : c))
      );
    }
  }, []);

  const allTags = Array.from(new Set(links.flatMap((l) => l.tags)));

  return {
    links,
    categories,
    allTags,
    loading,
    addLink,
    updateLink,
    deleteLink,
    toggleFavorite,
    addCategory,
    deleteCategory,
    renameCategory,
  };
}
