import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { linkSchema, categorySchema } from "@/lib/validation";
import { toast } from "sonner";
import type { LinkItem, Category } from "@/types/link";

export function useLinks(userId: string | undefined) {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
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
  }, [userId]);

  const addLink = useCallback(async (link: Omit<LinkItem, "id" | "createdAt">) => {
    if (!userId) return;
    const parsed = linkSchema.safeParse(link);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || "Dados inválidos");
      return;
    }
    const v = parsed.data;
    const { data, error } = await supabase
      .from("links")
      .insert({
        url: v.url,
        title: v.title,
        description: v.description,
        category: v.category,
        tags: v.tags,
        is_favorite: v.isFavorite,
        favicon: v.favicon || "",
        user_id: userId,
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
  }, [userId]);

  const updateLink = useCallback(async (id: string, data: Partial<LinkItem>) => {
    // Validate fields that are being updated
    const partial: any = {};
    if (data.url !== undefined) {
      const r = linkSchema.shape.url.safeParse(data.url);
      if (!r.success) { toast.error(r.error.errors[0]?.message); return; }
      partial.url = r.data;
    }
    if (data.title !== undefined) {
      const r = linkSchema.shape.title.safeParse(data.title);
      if (!r.success) { toast.error(r.error.errors[0]?.message); return; }
      partial.title = r.data;
    }
    if (data.description !== undefined) {
      const r = linkSchema.shape.description.safeParse(data.description);
      if (!r.success) { toast.error(r.error.errors[0]?.message); return; }
      partial.description = r.data;
    }
    if (data.category !== undefined) partial.category = data.category;
    if (data.tags !== undefined) {
      const r = linkSchema.shape.tags.safeParse(data.tags);
      if (!r.success) { toast.error(r.error.errors[0]?.message); return; }
      partial.tags = r.data;
    }
    if (data.isFavorite !== undefined) partial.is_favorite = data.isFavorite;
    if (data.favicon !== undefined) partial.favicon = data.favicon;

    const { error } = await supabase.from("links").update(partial).eq("id", id);
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
    if (!userId) return;
    const parsed = categorySchema.safeParse({ name });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || "Nome inválido");
      return;
    }
    const { data, error } = await supabase
      .from("categories")
      .insert({ name: parsed.data.name, user_id: userId })
      .select()
      .single();
    if (data && !error) {
      setCategories((prev) => [...prev, { id: data.id, name: data.name }]);
    }
  }, [userId]);

  const deleteCategory = useCallback(async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (!error) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
    }
  }, []);

  const renameCategory = useCallback(async (id: string, name: string) => {
    const parsed = categorySchema.safeParse({ name });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || "Nome inválido");
      return;
    }
    const { error } = await supabase.from("categories").update({ name: parsed.data.name }).eq("id", id);
    if (!error) {
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name: parsed.data.name } : c))
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
