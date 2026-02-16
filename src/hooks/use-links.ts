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
        supabase.from("links").select("*").order("position", { ascending: true }), // ✅ Ordenar por position
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
            position: r.position || 0, // ✅ Adicionar position
          }))
        );
      }
      if (catsRes.data) {
        setCategories(catsRes.data.map((r: any) => ({ id: r.id, name: r.name, icon: r.icon || "Folder" })));
      }
      setLoading(false);
    };
    fetchData();
  }, [userId]);

  const addLink = useCallback(async (link: Omit<LinkItem, "id" | "createdAt" | "position">) => {
    if (!userId) return;
    const parsed = linkSchema.safeParse(link);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || "Dados inválidos");
      return;
    }
    const v = parsed.data;
    // ✅ Calcular position (novo link vai para o topo)
    const maxPosition = Math.max(...links.map(l => l.position || 0), -1);
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
        position: maxPosition + 1, // ✅ Adicionar position
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
        position: data.position || 0, // ✅ Adicionar position
      };
      setLinks((prev) => [newLink, ...prev]);
    }
  }, [userId, links]);

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

  const addCategory = useCallback(async (name: string, icon: string = "Folder") => {
    if (!userId) return;
    const parsed = categorySchema.safeParse({ name, icon });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || "Dados inválidos");
      return;
    }
    const { data, error } = await supabase
      .from("categories")
      .insert({ name: parsed.data.name, user_id: userId, icon: parsed.data.icon })
      .select()
      .single();
    if (data && !error) {
      setCategories((prev) => [...prev, { id: data.id, name: data.name, icon: data.icon }]);
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

  // ✅ Função para reordenar links via drag & drop
  const reorderLinks = useCallback(async (reorderedLinks: LinkItem[]) => {
    try {
      // Atualizar estado local imediatamente (otimista)
      setLinks(reorderedLinks);
      
      // Enviar updates para o banco
      const updates = reorderedLinks.map((link, index) => ({
        id: link.id,
        position: index,
      }));
      
      // Executar updates em paralelo
      await Promise.all(
        updates.map(({ id, position }) =>
          supabase.from("links").update({ position }).eq("id", id)
        )
      );
    } catch (error) {
      console.error("Erro ao reordenar links:", error);
      toast.error("Erro ao reordenar links");
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
    reorderLinks, // ✅ Adicionar função de reorder
  };
}
