import { useState, useEffect, useCallback, useRef } from "react";
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
        supabase.from("links").select("id, url, title, description, category, tags, is_favorite, favicon, og_image, notes, created_at, position, deleted_at, user_id").order("position", { ascending: true }), // ✅ Ordenar por position
        supabase.from("categories").select("*").order("position", { ascending: true }), // ✅ Ordenar categorias por position
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
          ogImage: r.og_image || "",
          notes: r.notes || "",
          createdAt: r.created_at,
          position: r.position || 0, // ✅ Adicionar position
          deletedAt: r.deleted_at ?? null, // ✅ Soft delete
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
          position: r.position ?? 0,
          color: r.color ?? null,
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
    const { data, error }: { data: any; error: any } = await supabase
      .from("links")
      .insert({
        url: v.url,
        title: v.title,
        description: v.description,
        category: v.category,
        tags: v.tags,
        is_favorite: v.isFavorite,
        favicon: v.favicon || "",
        og_image: v.ogImage || "",
        notes: v.notes || "",
        user_id: userId,
        position: maxPosition + 1, // ✅ Adicionar position
      })
      .select("id, url, title, description, category, tags, is_favorite, favicon, og_image, notes, created_at, position, deleted_at, user_id")
      .single();
    if (error) {
      logger.error("Erro ao adicionar link", error, { url: v.url });
    }
    if (error) {
      logger.error("Erro ao adicionar link", error, { url: v.url });
      toast.error(error.message || "Erro ao adicionar link");
      return;
    }
    if (error) {
      logger.error("Erro ao adicionar link", error, { url: v.url });
      toast.error(error.message || "Erro ao adicionar link");
      return;
    }
    if (data) {
      console.log('useLinks newLink ogImage:', data.og_image);
      const newLink: LinkItem = {
        id: data.id,
        url: data.url,
        title: data.title,
        description: data.description,
        category: data.category,
        tags: data.tags || [],
        isFavorite: data.is_favorite,
        favicon: data.favicon,
        ogImage: data.og_image || "",
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
    if (data.ogImage !== undefined) partial.og_image = data.ogImage;
    if (data.notes !== undefined) partial.notes = data.notes;

    const { error } = await supabase.from("links").update(partial).eq("id", id);
    if (error) {
      logger.error("Erro ao atualizar link", error, { linkId: id });
    } else {
      setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...data } : l)));
    }
    }); // withRateLimit
  }, []);

  // ✅ Soft delete — move para lixeira
  const deleteLink = useCallback(async (id: string) => {
    return withRateLimit("link:delete", async () => {
    const now = new Date().toISOString();
    const { error } = await (supabase.from("links") as any).update({ deleted_at: now }).eq("id", id);
    if (error) {
      logger.error("Erro ao mover link para lixeira", error, { linkId: id });
    } else {
      setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, deletedAt: now } : l)));
    }
    }); // withRateLimit
  }, []);

  // ✅ Restaurar link da lixeira
  const restoreLink = useCallback(async (id: string) => {
    return withRateLimit("link:update", async () => {
      const { error } = await (supabase.from("links") as any).update({ deleted_at: null }).eq("id", id);
      if (error) {
        logger.error("Erro ao restaurar link", error, { linkId: id });
      } else {
        setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, deletedAt: null } : l)));
      }
    });
  }, []);

  // ✅ Deletar permanentemente
  const permanentDeleteLink = useCallback(async (id: string) => {
    return withRateLimit("link:delete", async () => {
      const { error } = await supabase.from("links").delete().eq("id", id);
      if (error) {
        logger.error("Erro ao deletar link permanentemente", error, { linkId: id });
      } else {
        setLinks((prev) => prev.filter((l) => l.id !== id));
      }
    });
  }, []);

  // ✅ Esvaziar lixeira
  const emptyTrash = useCallback(async () => {
    return withRateLimit("link:delete", async () => {
      const trashIds = links.filter((l) => l.deletedAt).map((l) => l.id);
      if (trashIds.length === 0) return;
      const { error } = await supabase.from("links").delete().in("id", trashIds);
      if (error) {
        logger.error("Erro ao esvaziar lixeira", error);
      } else {
        setLinks((prev) => prev.filter((l) => !l.deletedAt));
      }
    });
  }, [links]);

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

  const addCategory = useCallback(async (name: string, icon: string = "Folder", parentId?: string | null, color?: string | null) => {
    if (!userId) return;
    return withRateLimit("category:create", async () => {
    const parsed = categorySchema.safeParse({ name, icon, parentId: parentId ?? null, color: color ?? null });
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
      // ✅ Permitir até 3 níveis: verificar se o avô já tem parent
      if (parent.parentId) {
        const grandparent = categories.find((c) => c.id === parent.parentId);
        if (grandparent?.parentId) {
          toast.error("Máximo de 3 níveis de subcategorias atingido");
          return;
        }
      }
    }
    // ✅ Calcular posição (nova categoria vai para o final)
    const siblings = categories.filter((c) =>
      parsed.data.parentId ? c.parentId === parsed.data.parentId : !c.parentId
    );
    const maxPos = Math.max(...siblings.map(c => c.position), -1);
    const { data, error } = await supabase
      .from("categories")
      .insert({
        name: parsed.data.name,
        user_id: userId,
        icon: parsed.data.icon,
        parent_id: parsed.data.parentId ?? null,
        position: maxPos + 1,
        color: parsed.data.color ?? null,
      })
      .select("id, name, icon, parent_id, position, color")
      .single();
    if (error) {
      logger.error("Erro ao criar categoria", error, { name: parsed.data.name });
      if (error.message?.includes('idx_categories_unique_name')) {
        toast.error("Já existe uma categoria com este nome neste nível");
      } else {
        toast.error(error.message || "Erro ao criar categoria");
      }
      return;
    }
    if (data) {
      setCategories((prev) => [
        ...prev,
        
      ]);
    }
    }); // withRateLimit
  }, [userId, categories]);

  const deleteCategory = useCallback(async (id: string, cascade: boolean = false) => {
    return withRateLimit("category:delete", async () => {
    const category = categories.find((c) => c.id === id);
    if (!category) return;

    // ✅ Coletar todos os descendentes recursivamente
    const getAllDescendants = (parentId: string): Category[] => {
      const children = categories.filter((c) => c.parentId === parentId);
      return children.flatMap((child) => [child, ...getAllDescendants(child.id)]);
    };

    const descendants = getAllDescendants(id);
    const hasChildren = descendants.length > 0;

    if (hasChildren && !cascade) {
      toast.error("Use a opção de exclusão em cascata para remover categorias com subcategorias");
      return;
    }

    // Coletar todos os IDs a deletar (categoria + descendentes)
    const idsToDelete = [id, ...descendants.map((d) => d.id)];

    // Coletar todos os nomes completos para limpar links
    const namesToClear: string[] = [];
    const parent = category.parentId ? categories.find((c) => c.id === category.parentId) : null;
    namesToClear.push(getCategoryFullName(category, parent || undefined));
    for (const desc of descendants) {
      const descParent = categories.find((c) => c.id === desc.parentId);
      namesToClear.push(getCategoryFullName(desc, descParent || undefined));
    }

    // Deletar do banco (filhos primeiro, depois pais - por causa da FK)
    for (const delId of [...idsToDelete].reverse()) {
      const { error } = await supabase.from("categories").delete().eq("id", delId);
      if (error) {
        logger.error("Erro ao deletar categoria", error, { categoryId: delId });
        return;
      }
    }

    // Limpar links órfãos
    for (const name of namesToClear) {
      await supabase.from("links").update({ category: "" }).eq("category", name);
    }

    setLinks((prev) =>
      prev.map((l) => (namesToClear.includes(l.category) ? { ...l, category: "" } : l))
    );
    setCategories((prev) => prev.filter((c) => !idsToDelete.includes(c.id)));
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
          (supabase.from("links") as any).update({ position }).eq("id", id)
        )
      );
    } catch (error) {
      logger.error("Erro ao reordenar links", error instanceof Error ? error : new Error(String(error)));
      toast.error("Erro ao reordenar links");
    }
    }); // withRateLimit
  }, []);

  // ✅ Função para reordenar categorias via drag & drop
  const reorderCategories = useCallback(async (reorderedCategories: Category[]) => {
    return withRateLimit("category:reorder", async () => {
    try {
      setCategories(reorderedCategories);
      const updates = reorderedCategories.map((cat, index) => ({
        id: cat.id,
        position: index,
      }));
      await Promise.all(
        updates.map(({ id, position }) =>
          (supabase.from("categories") as any).update({ position }).eq("id", id)
        )
      );
    } catch (error) {
      logger.error("Erro ao reordenar categorias", error instanceof Error ? error : new Error(String(error)));
      toast.error("Erro ao reordenar categorias");
    }
    }); // withRateLimit
  }, []);

  // ✅ Função para atualizar a cor de uma categoria
  const updateCategoryColor = useCallback(async (id: string, color: string | null) => {
    return withRateLimit("category:update", async () => {
      const { error } = await (supabase.from("categories") as any).update({ color }).eq("id", id);
      if (error) {
        logger.error("Erro ao atualizar cor da categoria", error, { categoryId: id });
      } else {
        setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, color } : c)));
      }
    });
  }, []);

  // ✅ Função para atualizar o ícone de uma categoria
  const updateCategoryIcon = useCallback(async (id: string, icon: string) => {
    return withRateLimit("category:update", async () => {
      const { error } = await supabase.from("categories").update({ icon }).eq("id", id);
      if (error) {
        logger.error("Erro ao atualizar ícone da categoria", error, { categoryId: id });
      } else {
        setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, icon } : c)));
      }
    });
  }, []);

  const allTags = Array.from(new Set(links.flatMap((l) => l.tags)));

  // ✅ Full-text search no servidor (Supabase RPC)
  const [serverSearchResults, setServerSearchResults] = useState<LinkItem[] | null>(null);
  const [searching, setSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ftsAvailableRef = useRef<boolean>(true); // Desativa se RPC não existir

  const searchLinksOnServer = useCallback(async (query: string) => {
    if (!userId || !query.trim() || !ftsAvailableRef.current) {
      setServerSearchResults(null);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await (supabase.rpc as any)("search_links", {
        search_query: query.trim(),
        user_id_param: userId,
      });

      if (error) {
        // Se a função RPC não existir (migration não rodou), desativa para a sessão
        logger.warn("Full-text search RPC indisponível, usando busca client-side: " + error.message);
        ftsAvailableRef.current = false;
        setServerSearchResults(null);
        return;
      }

      if (data) {
        const mapped = (data as any[]).map((r: any) => ({
          id: r.id,
          url: r.url,
          title: r.title,
          description: r.description,
          category: r.category,
          tags: r.tags || [],
          isFavorite: r.is_favorite,
          favicon: r.favicon,
          ogImage: r.og_image || "",
          notes: r.notes || "",
          createdAt: r.created_at,
          position: r.position || 0,
        }));
        setServerSearchResults(mapped);
      }
    } catch (err) {
      logger.warn("Erro no full-text search", err as Error);
      setServerSearchResults(null);
    } finally {
      setSearching(false);
    }
  }, [userId]);

  // Debounce: dispara busca server-side 300ms após parar de digitar
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    const query = searchFilters.query.trim();
    if (!query) {
      setServerSearchResults(null);
      return;
    }

    searchDebounceRef.current = setTimeout(() => {
      searchLinksOnServer(query);
    }, 300);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchFilters.query, searchLinksOnServer]);

  // ✅ Links ativos (não deletados)
  const activeLinks = links.filter((l) => !l.deletedAt);
  // ✅ Links na lixeira
  const trashedLinks = links.filter((l) => !!l.deletedAt);

  // ✅ Função híbrida: usa resultado do servidor se disponível, senão client-side
  const getFilteredLinks = useCallback(() => {
    // Se tem resultados do full-text search, aplica filtros adicionais sobre eles
    const baseLinks = serverSearchResults && searchFilters.query.trim()
      ? serverSearchResults.filter((l) => !l.deletedAt)
      : activeLinks;

    return filterAndSortLinks(baseLinks, {
      ...searchFilters,
      // Se já veio do servidor, não filtrar por query de novo
      query: serverSearchResults && searchFilters.query.trim() ? "" : searchFilters.query,
    });
  }, [activeLinks, searchFilters, serverSearchResults]);

  return {
    links: activeLinks,
    trashedLinks,
    categories,
    allTags,
    loading,
    searching,
    searchFilters,
    setSearchFilters,
    getFilteredLinks,
    addLink,
    updateLink,
    deleteLink,
    restoreLink,
    permanentDeleteLink,
    emptyTrash,
    toggleFavorite,
    addCategory,
    deleteCategory,
    renameCategory,
    reorderLinks, // ✅ Adicionar função de reorder
    reorderCategories, // ✅ Reordenar categorias
    updateCategoryColor, // ✅ Atualizar cor
    updateCategoryIcon, // ✅ Atualizar ícone
  };
}
