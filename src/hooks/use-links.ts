import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { linkSchema, categorySchema } from "@/lib/validation";
import { filterAndSortLinks } from "@/lib/utils";
import { toast } from "sonner";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limiter";
import { logger } from "@/lib/logger";
import {
  cacheLinks,
  cacheCategories,
  getCachedLinks,
  getCachedCategories,
  addPendingAction,
} from "@/lib/offline-cache";
import type { LinkItem, Category, SearchFilters } from "@/types/link";

/** Helper para executar operação com rate limiting */
function withRateLimit(operation: string, fn: () => Promise<void>): Promise<void> {
  try {
    enforceRateLimit(operation);
  } catch (e) {
    if (e instanceof RateLimitError) {
      toast.error(e.message);
      return Promise.resolve();
    }
    throw e;
  }
  return fn();
}

export function useLinks(userId: string | undefined) {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: "",
    category: null,
    tags: [],
    period: "all",
    sort: "manual",
    favoritesOnly: false,
  });

  const getCategoryFullName = useCallback((cat: Category, parent?: Category | null) => {
    return parent ? `${parent.name} / ${cat.name}` : cat.name;
  }, []);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const fetchData = async () => {
      setLoading(true);

      // ✅ Se estiver offline, carregar do cache local
      if (!navigator.onLine) {
        const cachedLinks = getCachedLinks();
        const cachedCats = getCachedCategories();
        if (cachedLinks) setLinks(cachedLinks);
        if (cachedCats) setCategories(cachedCats);
        setLoading(false);
        toast.info("Modo offline — exibindo dados salvos localmente");
        return;
      }

      const [linksRes, catsRes] = await Promise.all([
        supabase.from("links").select("*").order("position", { ascending: true }), // ✅ Ordenar por position
        supabase.from("categories").select("*"),
      ]);
      if (linksRes.data) {
        const mappedLinks = linksRes.data.map((r: any) => ({
          id: r.id,
          url: r.url,
          title: r.title,
          description: r.description,
          category: r.category,
          tags: r.tags || [],
          isFavorite: r.is_favorite,
          favicon: r.favicon,
          notes: r.notes || "",
          createdAt: r.created_at,
          position: r.position || 0, // ✅ Adicionar position
        }));
        setLinks(mappedLinks);
        cacheLinks(mappedLinks); // ✅ Salvar no cache offline
      }
      if (catsRes.data) {
        const mappedCats = catsRes.data.map((r: any) => ({
          id: r.id,
          name: r.name,
          icon: r.icon || "Folder",
          parentId: r.parent_id ?? null,
        }));
        setCategories(mappedCats);
        cacheCategories(mappedCats); // ✅ Salvar no cache offline
      }
      setLoading(false);
    };
    fetchData();
  }, [userId]);

  // ✅ Manter cache offline sincronizado quando dados mudam
  useEffect(() => {
    if (links.length > 0) cacheLinks(links);
  }, [links]);

  useEffect(() => {
    if (categories.length > 0) cacheCategories(categories);
  }, [categories]);

  const addLink = useCallback(async (link: Omit<LinkItem, "id" | "createdAt" | "position">) => {
    if (!userId) return;
    return withRateLimit("link:create", async () => {
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
        notes: v.notes || "",
        user_id: userId,
        position: maxPosition + 1, // ✅ Adicionar position
      })
      .select()
      .single();
    if (error) {
      logger.error("Erro ao adicionar link", error, { url: v.url });
    }
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
        notes: data.notes || "",
        createdAt: data.created_at,
        position: data.position || 0, // ✅ Adicionar position
      };
      setLinks((prev) => [newLink, ...prev]);
    }
    }); // withRateLimit
  }, [userId, links]);

  const updateLink = useCallback(async (id: string, data: Partial<LinkItem>) => {
    return withRateLimit("link:update", async () => {
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
    if (data.notes !== undefined) partial.notes = data.notes;

    const { error } = await supabase.from("links").update(partial).eq("id", id);
    if (error) {
      logger.error("Erro ao atualizar link", error, { linkId: id });
    } else {
      setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...data } : l)));
    }
    }); // withRateLimit
  }, []);

  const deleteLink = useCallback(async (id: string) => {
    return withRateLimit("link:delete", async () => {
    const { error } = await supabase.from("links").delete().eq("id", id);
    if (error) {
      logger.error("Erro ao deletar link", error, { linkId: id });
    } else {
      setLinks((prev) => prev.filter((l) => l.id !== id));
    }
    }); // withRateLimit
  }, []);

  const toggleFavorite = useCallback(async (id: string) => {
    return withRateLimit("link:favorite", async () => {
    const link = links.find((l) => l.id === id);
    if (!link) return;
    const newVal = !link.isFavorite;
    const { error } = await supabase.from("links").update({ is_favorite: newVal }).eq("id", id);
    if (!error) {
      setLinks((prev) =>
        prev.map((l) => (l.id === id ? { ...l, isFavorite: newVal } : l))
      );
    }
    }); // withRateLimit
  }, [links]);

  const addCategory = useCallback(async (name: string, icon: string = "Folder", parentId?: string | null) => {
    if (!userId) return;
    return withRateLimit("category:create", async () => {
    const parsed = categorySchema.safeParse({ name, icon, parentId: parentId ?? null });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || "Dados inválidos");
      return;
    }
    if (parsed.data.parentId) {
      const parent = categories.find((c) => c.id === parsed.data.parentId);
      if (!parent) {
        toast.error("Categoria pai não encontrada");
        return;
      }
      if (parent.parentId) {
        toast.error("Subcategorias só podem ter 2 níveis");
        return;
      }
    }
    const { data, error } = await supabase
      .from("categories")
      .insert({
        name: parsed.data.name,
        user_id: userId,
        icon: parsed.data.icon,
        parent_id: parsed.data.parentId ?? null,
      })
      .select()
      .single();
    if (error) {
      logger.error("Erro ao criar categoria", error, { name: parsed.data.name });
      toast.error(error.message || "Erro ao criar categoria");
      return;
    }
    if (data) {
      setCategories((prev) => [
        ...prev,
        { id: data.id, name: data.name, icon: data.icon, parentId: data.parent_id ?? null },
      ]);
    }
    }); // withRateLimit
  }, [userId, categories]);

  const deleteCategory = useCallback(async (id: string) => {
    return withRateLimit("category:delete", async () => {
    const category = categories.find((c) => c.id === id);
    if (!category) return;

    const hasChildren = categories.some((c) => c.parentId === id);
    if (hasChildren) {
      toast.error("Remova as subcategorias antes de excluir esta categoria");
      return;
    }

    const parent = category.parentId ? categories.find((c) => c.id === category.parentId) : null;
    const fullName = getCategoryFullName(category, parent || undefined);

    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (!error) {
      await supabase.from("links").update({ category: "" }).eq("category", fullName);
      setLinks((prev) => prev.map((l) => (l.category === fullName ? { ...l, category: "" } : l)));
      setCategories((prev) => prev.filter((c) => c.id !== id));
    }
    }); // withRateLimit
  }, [categories, getCategoryFullName]);

  const renameCategory = useCallback(async (id: string, name: string) => {
    return withRateLimit("category:rename", async () => {
    const parsed = categorySchema.safeParse({ name });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || "Nome inválido");
      return;
    }
    const category = categories.find((c) => c.id === id);
    if (!category) return;

    const parent = category.parentId ? categories.find((c) => c.id === category.parentId) : null;
    const oldName = getCategoryFullName(category, parent || undefined);

    const updates: Array<{ from: string; to: string }> = [];
    if (category.parentId) {
      const newName = getCategoryFullName({ ...category, name: parsed.data.name }, parent || undefined);
      updates.push({ from: oldName, to: newName });
    } else {
      const newParentName = parsed.data.name;
      updates.push({ from: oldName, to: newParentName });

      const children = categories.filter((c) => c.parentId === id);
      children.forEach((child) => {
        updates.push({
          from: getCategoryFullName(child, category),
          to: getCategoryFullName(child, { ...category, name: newParentName }),
        });
      });
    }

    const { error } = await supabase.from("categories").update({ name: parsed.data.name }).eq("id", id);
    if (!error) {
      await Promise.all(
        updates.map((u) => supabase.from("links").update({ category: u.to }).eq("category", u.from))
      );
      setLinks((prev) =>
        prev.map((l) => {
          const update = updates.find((u) => u.from === l.category);
          return update ? { ...l, category: update.to } : l;
        })
      );
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name: parsed.data.name } : c))
      );
    }
    }); // withRateLimit
  }, [categories, getCategoryFullName]);

  // ✅ Função para reordenar links via drag & drop
  const reorderLinks = useCallback(async (reorderedLinks: LinkItem[]) => {
    return withRateLimit("link:reorder", async () => {
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
      logger.error("Erro ao reordenar links", error instanceof Error ? error : new Error(String(error)));
      toast.error("Erro ao reordenar links");
    }
    }); // withRateLimit
  }, []);

  const allTags = Array.from(new Set(links.flatMap((l) => l.tags)));

  // ✅ Função para obter links filtrados
  const getFilteredLinks = useCallback(() => {
    return filterAndSortLinks(links, searchFilters);
  }, [links, searchFilters]);

  return {
    links,
    categories,
    allTags,
    loading,
    searchFilters,
    setSearchFilters,
    getFilteredLinks,
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
