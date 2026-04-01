import { useState, useRef, useCallback, useMemo, useEffect, lazy, Suspense } from "react";
import { Plus, Download, Upload, LogOut, BarChart3, Clock, Command, Trash2, ShieldCheck, Settings, Stethoscope } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotionSettingsDialog } from "@/components/NotionSettingsDialog";
import { LinkDiagnostics } from "@/components/LinkDiagnostics";
import { MicrolinkRateLimitWarning } from "@/components/MicrolinkRateLimitWarning";
import { useMicrolinkRateLimit } from "@/hooks/use-microlink-rate-limit";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LinkCard } from "@/components/LinkCard";
import { LinkNotionView } from "@/components/LinkNotionView";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import type { GridColumns, CardSize } from "@/components/ViewSwitcher";
import { SearchBar } from "@/components/SearchBar";
import { DragDropOverlay } from "@/components/DragDropOverlay";
import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { useLinkChecker } from "@/hooks/use-link-checker";
import { CommandPalette, buildDefaultCommands } from "@/components/CommandPalette";
import { BatchActionBar } from "@/components/BatchActionBar";
import { Button } from "@/components/ui/button";
import { useLinks } from "@/hooks/use-links";
import { useActivityLog } from "@/hooks/use-activity-log";
import { useDragDropManager } from "@/hooks/use-drag-drop-manager";
import { toast } from "sonner";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import type { LinkItem, SearchFilters, ViewMode } from "@/types/link";
import type { User } from "@supabase/supabase-js";

const LinkForm = lazy(() => import("@/components/LinkForm").then((m) => ({ default: m.LinkForm })));
const StatsDashboard = lazy(() => import("@/components/StatsDashboard").then((m) => ({ default: m.StatsDashboard })));
const ExportFormatDialog = lazy(() => import("@/components/ExportFormatDialog").then((m) => ({ default: m.ExportFormatDialog })));
const ImportFormatDialog = lazy(() => import("@/components/ImportFormatDialog").then((m) => ({ default: m.ImportFormatDialog })));
const ActivityPanel = lazy(() => import("@/components/ActivityPanel").then((m) => ({ default: m.ActivityPanel })));
const TrashView = lazy(() => import("@/components/TrashView").then((m) => ({ default: m.TrashView })));
const LinkCheckerPanel = lazy(() => import("@/components/LinkCheckerPanel").then((m) => ({ default: m.LinkCheckerPanel })));
const LinkTableView = lazy(() => import("@/components/LinkTableView").then((m) => ({ default: m.LinkTableView })));
const LinkBoardView = lazy(() => import("@/components/LinkBoardView").then((m) => ({ default: m.LinkBoardView })));
const LinkCardsView = lazy(() => import("@/components/LinkCardsView").then((m) => ({ default: m.LinkCardsView })));
const LinkGalleryView = lazy(() => import("@/components/LinkGalleryView").then((m) => ({ default: m.LinkGalleryView })));

interface IndexProps {
  user: User;
  onSignOut: () => void;
}

const Index = ({ user, onSignOut }: IndexProps) => {
  const isMobile = useIsMobile();
  const { isRateLimited, dismiss: dismissRateLimit, timeRemaining } = useMicrolinkRateLimit();
  const {
    links,
    categories,
    allTags,
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
    trashedLinks,
    toggleFavorite,
    addCategory,
    deleteCategory,
    renameCategory,
    reorderLinks,
    reorderLinksInStatus,
    reorderCategories,
    updateCategoryColor,
    updateCategoryIcon,
  } = useLinks(user.id);

  const {
    dragState,
    canUndo,
    canRedo,
    lastKnownDrop,
    handleDragStart: dragStart,
    handleDragOver: dragOver,
    handleDragLeave: dragLeave,
    handleDragEnd: dragEnd,
    undo,
    redo,
  } = useDragDropManager(links, categories);

  const { entries: activityEntries, logActivity, clearLog } = useActivityLog();
  const { results: linkCheckResults, checking: linkChecking, progress: linkCheckProgress, checkLinks, cancelCheck: cancelLinkCheck, clearResults: clearLinkCheckResults } = useLinkChecker();

  const [formOpen, setFormOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "list";
    const saved = window.localStorage.getItem("view-mode");
    const modes: ViewMode[] = ["grid", "list", "cards", "table", "board", "gallery"];
    return modes.includes(saved as ViewMode) ? (saved as ViewMode) : "list";
  });
  const [gridColumns, setGridColumns] = useState<GridColumns>(3);
  const [cardSize, setCardSize] = useState<CardSize>("md");
  const [statsOpen, setStatsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [linkCheckerOpen, setLinkCheckerOpen] = useState(false);
  const [notionSettingsOpen, setNotionSettingsOpen] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredLinks = getFilteredLinks();
  const isDragView = viewMode === "grid" || viewMode === "list" || viewMode === "cards";
  const canManualDrag = searchFilters.sort === "manual" && isDragView;
  const showManualReorderHint = searchFilters.sort === "manual" && isDragView && filteredLinks.length < 2;

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("view-mode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== "cards") return;
    if (searchFilters.sort === "manual") return;
    setSearchFilters((prev) => ({ ...prev, sort: "manual" }));
  }, [viewMode, searchFilters.sort, setSearchFilters]);

  // ✅ Atalhos de teclado globais
  useKeyboardShortcuts({
    onNewLink: useCallback(() => { setEditingLink(null); setFormOpen(true); }, []),
    onFocusSearch: useCallback(() => searchInputRef.current?.focus(), []),
    onToggleView: useCallback(() => setViewMode((v) => {
      const modes: ViewMode[] = ["grid", "list", "cards", "table", "board", "gallery"];
      const i = modes.indexOf(v);
      return modes[(i + 1) % modes.length];
    }), []),
    onOpenStats: useCallback(() => setStatsOpen(true), []),
    onOpenExport: useCallback(() => setExportOpen(true), []),
    onOpenImport: useCallback(() => setImportOpen(true), []),
    onOpenCommandPalette: useCallback(() => setCommandOpen(true), []),
  });

  const handleSubmit = (data: Omit<LinkItem, "id" | "createdAt" | "position">) => {
    if (editingLink) {
      updateLink(editingLink.id, data);
      logActivity("link:updated", data.title || data.url, `URL: ${data.url}`);
    } else {
      addLink(data);
      logActivity("link:created", data.title || data.url, `URL: ${data.url}`);
    }
    setEditingLink(null);
  };

  const handleEdit = (link: LinkItem) => {
    setEditingLink(link);
    setFormOpen(true);
  };

  const handleDelete = useCallback((id: string) => {
    const link = links.find((l) => l.id === id);
    deleteLink(id);
    logActivity("link:trashed", link?.title || "Link removido", link?.url);
  }, [links, deleteLink, logActivity]);

  const handleToggleFavorite = useCallback((id: string) => {
    const link = links.find((l) => l.id === id);
    toggleFavorite(id);
    if (link) {
      logActivity(
        link.isFavorite ? "link:unfavorited" : "link:favorited",
        link.title || link.url
      );
    }
  }, [links, toggleFavorite, logActivity]);

  // ✅ Batch operations
  const lastSelectedRef = useRef<string | null>(null);

  const handleToggleSelect = useCallback((id: string, shiftKey?: boolean) => {
    if (shiftKey && lastSelectedRef.current && lastSelectedRef.current !== id) {
      // Shift+Click range selection
      const startIdx = filteredLinks.findIndex((l) => l.id === lastSelectedRef.current);
      const endIdx = filteredLinks.findIndex((l) => l.id === id);
      if (startIdx !== -1 && endIdx !== -1) {
        const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        setSelectedIds((prev) => {
          const next = new Set(prev);
          for (let i = from; i <= to; i++) next.add(filteredLinks[i].id);
          return next;
        });
        lastSelectedRef.current = id;
        return;
      }
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    lastSelectedRef.current = id;
  }, [filteredLinks]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
    lastSelectedRef.current = null;
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(filteredLinks.map((l) => l.id)));
  }, [filteredLinks]);

  // Escape key clears selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedIds.size > 0) {
        e.preventDefault();
        handleClearSelection();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds.size, handleClearSelection]);

  const handleBatchDelete = useCallback(() => {
    const count = selectedIds.size;
    selectedIds.forEach((id) => deleteLink(id));
    logActivity("link:trashed", `${count} links movidos para lixeira`);
    setSelectedIds(new Set());
    toast.success(`${count} link(s) movido(s) para a lixeira`);
  }, [selectedIds, deleteLink, logActivity]);

  const handleBatchFavorite = useCallback(() => {
    let count = 0;
    selectedIds.forEach((id) => {
      const link = links.find((l) => l.id === id);
      if (link && !link.isFavorite) { toggleFavorite(id); count++; }
    });
    setSelectedIds(new Set());
    toast.success(`${count} link(s) favoritado(s)`);
  }, [selectedIds, links, toggleFavorite]);

  const handleBatchUnfavorite = useCallback(() => {
    let count = 0;
    selectedIds.forEach((id) => {
      const link = links.find((l) => l.id === id);
      if (link && link.isFavorite) { toggleFavorite(id); count++; }
    });
    setSelectedIds(new Set());
    toast.success(`${count} link(s) desfavoritado(s)`);
  }, [selectedIds, links, toggleFavorite]);

  const handleBatchMove = useCallback((categoryName: string) => {
    const count = selectedIds.size;
    selectedIds.forEach((id) => updateLink(id, { category: categoryName }));
    logActivity("link:updated", `${count} links movidos`, `Para: ${categoryName || "Sem categoria"}`);
    setSelectedIds(new Set());
    toast.success(`${count} link(s) movido(s) para "${categoryName || "Sem categoria"}"`);
  }, [selectedIds, updateLink, logActivity]);

  const handleBatchStatus = useCallback((status: LinkItem["status"]) => {
    const count = selectedIds.size;
    selectedIds.forEach((id) => updateLink(id, { status }));
    logActivity("link:updated", `${count} links com status atualizado`, `Status: ${status}`);
    setSelectedIds(new Set());
    toast.success(`Status atualizado para ${count} link(s)`);
  }, [selectedIds, updateLink, logActivity]);

  const handleBatchPriority = useCallback((priority: LinkItem["priority"]) => {
    const count = selectedIds.size;
    selectedIds.forEach((id) => updateLink(id, { priority }));
    logActivity("link:updated", `${count} links com prioridade atualizada`, `Prioridade: ${priority}`);
    setSelectedIds(new Set());
    toast.success(`Prioridade atualizada para ${count} link(s)`);
  }, [selectedIds, updateLink, logActivity]);

  const handleMoveToStatus = useCallback((id: string, status: LinkItem["status"]) => {
    const link = links.find((l) => l.id === id);
    if (!link) return;

    const nextPositionInStatus =
      Math.max(
        ...links
          .filter((l) => l.status === status)
          .map((l) => l.positionInStatus ?? l.position ?? 0),
        -1
      ) + 1;

    reorderLinksInStatus([
      {
        id,
        status,
        positionInStatus: nextPositionInStatus,
      },
    ]);
    logActivity("link:updated", link?.title || "Link", `Status alterado para ${status}`);
    toast.success(`Status atualizado para ${status === "backlog" ? "Backlog" : status === "in_progress" ? "Em progresso" : "Concluído"}`);
  }, [links, reorderLinksInStatus, logActivity]);

  const handleReorderWithinStatus = useCallback((draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;

    const draggedLink = links.find((l) => l.id === draggedId);
    const targetLink = links.find((l) => l.id === targetId);
    if (!draggedLink || !targetLink || draggedLink.status !== targetLink.status) return;

    const statusGroup = links
      .filter((l) => l.status === draggedLink.status)
      .sort((a, b) => (a.positionInStatus ?? a.position ?? 0) - (b.positionInStatus ?? b.position ?? 0));

    const draggedIndex = statusGroup.findIndex((l) => l.id === draggedId);
    const targetIndex = statusGroup.findIndex((l) => l.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const next = statusGroup.filter((l) => l.id !== draggedId);
    next.splice(targetIndex, 0, draggedLink);

    const updates = next.map((link, index) => ({
      id: link.id,
      status: link.status,
      positionInStatus: index,
    }));

    reorderLinksInStatus(updates);
    logActivity("link:reordered", "Links reordenados no board", `Status: ${draggedLink.status}`);
  }, [links, reorderLinksInStatus, logActivity]);

  const handleBatchTag = useCallback((tag: string) => {
    let count = 0;
    selectedIds.forEach((id) => {
      const link = links.find((l) => l.id === id);
      if (link && !link.tags.includes(tag)) {
        updateLink(id, { tags: [...link.tags, tag] });
        count++;
      }
    });
    logActivity("link:updated", `Tag "${tag}" adicionada a ${count} links`);
    toast.success(`Tag "${tag}" adicionada a ${count} link(s)`);
  }, [selectedIds, links, updateLink, logActivity]);

  const handleBatchRemoveTag = useCallback((tag: string) => {
    let count = 0;
    selectedIds.forEach((id) => {
      const link = links.find((l) => l.id === id);
      if (link && link.tags.includes(tag)) {
        updateLink(id, { tags: link.tags.filter((t) => t !== tag) });
        count++;
      }
    });
    logActivity("link:updated", `Tag "${tag}" removida de ${count} links`);
    toast.success(`Tag "${tag}" removida de ${count} link(s)`);
  }, [selectedIds, links, updateLink, logActivity]);

  // Command palette commands
  const commands = useMemo(() => buildDefaultCommands({
    onNewLink: () => { setEditingLink(null); setFormOpen(true); },
    onFocusSearch: () => searchInputRef.current?.focus(),
    onSetView: setViewMode,
    onOpenStats: () => setStatsOpen(true),
    onOpenExport: () => setExportOpen(true),
    onOpenImport: () => setImportOpen(true),
    onOpenHistory: () => setHistoryOpen(true),
    onToggleFavorites: () => setSearchFilters((prev) => ({
      ...prev,
      favoritesOnly: !prev.favoritesOnly,
      category: null,
      tags: [],
    })),
    onSignOut,
  }), [onSignOut, setSearchFilters]);

  // ✅ Handlers para Drag & Drop com validação
  const handleDragStart = (e: React.DragEvent, link: LinkItem) => {
    if (!canManualDrag) {
      toast.error("Ative 'Manual' para reordenar links");
      e.preventDefault();
      return;
    }
    if (filteredLinks.length < 2) {
      toast.info("Mostre pelo menos 2 links para reordenar");
      e.preventDefault();
      return;
    }
    dragStart(e, link);
  };

  const handleDragOver = (e: React.DragEvent, linkId: string) => {
    if (!canManualDrag) return;
    dragOver(e, linkId);
  };

  const handleDrop = (e: React.DragEvent, targetLink: LinkItem) => {
    if (!canManualDrag) {
      toast.error("Ative 'Manual' para reordenar links");
      return;
    }

    const dragId = dragState.draggedLink?.id || e.dataTransfer.getData("text/plain");
    const eventTargetId = (e.currentTarget as HTMLElement | null)?.dataset?.cardId;
    const trackedTargetId = lastKnownDrop.current.targetId;
    const resolvedTargetId =
      (eventTargetId && eventTargetId !== dragId ? eventTargetId : null) ||
      (trackedTargetId && trackedTargetId !== dragId ? trackedTargetId : null) ||
      targetLink.id;

    if (!dragId || dragId === resolvedTargetId) {
      dragEnd();
      return;
    }

    const ordered = [...links].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const dragIndex = ordered.findIndex((item) => item.id === dragId);
    const targetIndex = ordered.findIndex((item) => item.id === resolvedTargetId);

    if (dragIndex === -1 || targetIndex === -1 || dragIndex === targetIndex) {
      dragEnd();
      return;
    }

    const dragged = ordered[dragIndex];
    const withoutDragged = ordered.filter((item) => item.id !== dragId);
    const targetIndexAfterRemoval = withoutDragged.findIndex((item) => item.id === resolvedTargetId);

    const insertIndex = dragIndex < targetIndex
      ? Math.min(withoutDragged.length, targetIndexAfterRemoval + 1)
      : Math.max(0, targetIndexAfterRemoval);

    withoutDragged.splice(insertIndex, 0, dragged);

    const reordered = withoutDragged.map((item, index) => ({
      ...item,
      position: index,
    }));

    reorderLinks(reordered);
    logActivity("link:reordered", "Links reordenados", `${reordered.length} links`);
    toast.success("Links reordenados!");
    dragEnd();
  };

  // Função de importação segura (limite de tamanho e quantidade)
  const handleImportLinks = async (importedLinks: Omit<LinkItem, "id" | "createdAt" | "position">[]) => {
    const MAX_LINKS_PER_IMPORT = 1000;
    if (importedLinks.length > MAX_LINKS_PER_IMPORT) {
      toast.error(`Máximo de ${MAX_LINKS_PER_IMPORT} links por importação (seu arquivo tem ${importedLinks.length})`);
      return;
    }
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    for (let index = 0; index < importedLinks.length; index++) {
      const linkData = importedLinks[index];
      try {
        await addLink(linkData);
        successCount++;
      } catch (error) {
        errorCount++;
        errors.push(`Link ${index + 1}: Erro ao adicionar link`);
      }
    }
    if (successCount > 0) {
      toast.success(`✅ ${successCount} link(s) importado(s) com sucesso!`);
      logActivity("import:completed", `${successCount} links importados`, errorCount > 0 ? `${errorCount} falharam` : undefined);
    }
    if (errorCount > 0) {
      toast.error(`⚠️ ${errorCount} erro(s) encontrado(s)`);
      if (errors.length <= 5) {
        console.error("Erros de importação:", errors.join("\n"));
      }
    }
  };

  // ✅ Sidebar filter handler — atualiza searchFilters
  const handleSidebarFilter = useCallback(
    (filter: { type: "all" | "favorites" | "category" | "tag"; value?: string }) => {
      setSearchFilters((prev) => {
        switch (filter.type) {
          case "all":
            return { ...prev, category: null, tags: [], favoritesOnly: false };
          case "favorites":
            return { ...prev, category: null, tags: [], favoritesOnly: true };
          case "category":
            return { ...prev, category: filter.value ?? null, tags: [], favoritesOnly: false };
          case "tag":
            return {
              ...prev,
              category: null,
              favoritesOnly: false,
              tags: filter.value ? [filter.value] : [],
            };
          default:
            return prev;
        }
      });
    },
    [setSearchFilters]
  );

  // Derivar filtro ativo para highlight na sidebar
  const activeFilter = searchFilters.favoritesOnly
    ? { type: "favorites" as const }
    : searchFilters.category
      ? { type: "category" as const, value: searchFilters.category }
      : searchFilters.tags.length === 1
        ? { type: "tag" as const, value: searchFilters.tags[0] }
        : { type: "all" as const };

  const filterLabel = searchFilters.query
    ? `Resultados para "${searchFilters.query}"`
    : searchFilters.category
      ? searchFilters.category
      : searchFilters.favoritesOnly
        ? "Favoritos"
        : "Todos os Links";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar
          categories={categories}
          allTags={allTags}
          activeFilter={activeFilter}
          onFilterChange={handleSidebarFilter}
          onAddCategory={addCategory}
          onDeleteCategory={deleteCategory}
          onRenameCategory={renameCategory}
          onReorderCategories={reorderCategories}
          onUpdateCategoryColor={updateCategoryColor}
          onUpdateCategoryIcon={updateCategoryIcon}
          onDropLinkToCategory={(linkId, categoryName) => {
            updateLink(linkId, { category: categoryName });
            const link = links.find((l) => l.id === linkId);
            logActivity("link:updated", link?.title || "Link", `Movido para "${categoryName}"`);
            toast.success(`Link movido para "${categoryName}"`);
            dragEnd();
          }}
        />

        <main className="flex-1 p-3 md:p-6">
          {/* Header */}
          <header className="mb-4 md:mb-6 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="text-2xl font-bold tracking-tight">{filterLabel}</h1>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
              <ThemeToggle />
              <ViewSwitcher viewMode={viewMode} onViewModeChange={setViewMode} gridColumns={gridColumns} onGridColumnsChange={setGridColumns} cardSize={cardSize} onCardSizeChange={setCardSize} />
              <Button variant="outline" size="icon" onClick={() => setCommandOpen(true)} title="Comandos (/ ou Ctrl+K)">
                <Command className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setHistoryOpen(true)} title="Histórico">
                <Clock className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setStatsOpen(true)} title="Estatísticas (S)">
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setTrashOpen(true)} title="Lixeira" className="relative">
                <Trash2 className="h-4 w-4" />
                {trashedLinks.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
                    {trashedLinks.length}
                  </span>
                )}
              </Button>
              <Button variant="outline" size="icon" onClick={() => setLinkCheckerOpen(true)} title="Verificar links">
                <ShieldCheck className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setDiagnosticsOpen(true)} title="Diagnóstico de Thumbnails">
                <Stethoscope className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setNotionSettingsOpen(true)} title="Configurações do Notion">
                <Settings className="h-4 w-4" />
              </Button>
              {!isMobile && (
                <>
                  <Button variant="outline" size="icon" onClick={() => setExportOpen(true)} title="Exportar (E)">
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setImportOpen(true)} title="Importar (I)">
                    <Download className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button onClick={() => { setEditingLink(null); setFormOpen(true); }} title="Novo link (N)" size={isMobile ? "icon" : "default"}>
                <Plus className={isMobile ? "h-4 w-4" : "mr-1.5 h-4 w-4"} />
                {!isMobile && "Novo Link"}
              </Button>
              <Button variant="ghost" size="icon" onClick={onSignOut} title="Sair">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>

          {/* Advanced Search Bar */}
          <SearchBar
            ref={searchInputRef}
            filters={searchFilters}
            onFiltersChange={setSearchFilters}
            categories={categories}
            allTags={allTags}
            searching={searching}
          />

          {/* Breadcrumb Navigation */}
          <BreadcrumbNav
            categoryFilter={searchFilters.category}
            categories={categories}
            onNavigate={(cat) => handleSidebarFilter({ type: cat ? "category" : "all", value: cat ?? undefined })}
          />

          {/* Microlink Rate Limit Warning */}
          {isRateLimited && (
            <MicrolinkRateLimitWarning 
              onDismiss={dismissRateLimit}
              timeRemaining={timeRemaining}
            />
          )}

          {showManualReorderHint && (
            <div className="mt-3 rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Reordenacao manual ativa. Mostre pelo menos 2 links para arrastar e reordenar.
            </div>
          )}

          {/* Links Grid/List */}
          <div className={viewMode === "list" ? "mt-4" : "mt-6"}>
          <Suspense fallback={<div className="py-6 text-sm text-muted-foreground">Carregando visualizacao...</div>}>
          {filteredLinks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-lg text-muted-foreground">
                {links.length === 0
                  ? "Nenhum link salvo ainda. Adicione o primeiro!"
                  : "Nenhum link encontrado para este filtro."}
              </p>
              {links.length === 0 && (
                <Button className="mt-4" onClick={() => setFormOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Adicionar Link
                </Button>
              )}
            </div>
          ) : viewMode === "cards" ? (
            <LinkCardsView
              links={filteredLinks}
              cardSize={cardSize}
              onToggleFavorite={handleToggleFavorite}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDragStart={canManualDrag ? handleDragStart : undefined}
              onDragOver={canManualDrag ? handleDragOver : undefined}
              onDragLeave={canManualDrag ? dragLeave : undefined}
              onDragEnd={canManualDrag ? dragEnd : undefined}
              onDrop={canManualDrag ? handleDrop : undefined}
              draggedLinkId={dragState.draggedLink?.id ?? null}
              dropZoneId={dragState.dropZoneId}
              dragDirection={dragState.dragDirection}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
            />
          ) : viewMode === "table" ? (
            <LinkTableView
              links={filteredLinks}
              onToggleFavorite={handleToggleFavorite}
              onUpdateLink={updateLink}
              onEdit={handleEdit}
              onDelete={handleDelete}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectAll}
            />
          ) : viewMode === "list" ? (
            <LinkNotionView
              links={filteredLinks}
              onToggleFavorite={handleToggleFavorite}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDragStart={canManualDrag ? handleDragStart : undefined}
              onDragOver={canManualDrag ? handleDragOver : undefined}
              onDragLeave={canManualDrag ? dragLeave : undefined}
              onDragEnd={canManualDrag ? dragEnd : undefined}
              onDrop={canManualDrag ? handleDrop : undefined}
              draggedLinkId={dragState.draggedLink?.id ?? null}
              dropZoneId={dragState.dropZoneId}
              dragDirection={dragState.dragDirection}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              linkStatusById={linkCheckResults}
            />
          ) : viewMode === "board" ? (
            <LinkBoardView
              links={filteredLinks}
              onToggleFavorite={handleToggleFavorite}
              onUpdateLink={updateLink}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onMoveToStatus={handleMoveToStatus}
              onReorderWithinStatus={handleReorderWithinStatus}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
            />
          ) : viewMode === "gallery" ? (
            <LinkGalleryView
              links={filteredLinks}
              categories={categories}
              onToggleFavorite={handleToggleFavorite}
              onEdit={handleEdit}
              onDelete={handleDelete}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
            />
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? `grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 ${
                      gridColumns === 2 ? "lg:grid-cols-2" :
                      gridColumns === 4 ? "lg:grid-cols-4" :
                      gridColumns === 5 ? "lg:grid-cols-4 xl:grid-cols-5" :
                      "lg:grid-cols-3"
                    }`
                  : "flex flex-col gap-2 md:gap-3"
              }
            >
              {filteredLinks.map((link) => (
                <LinkCard
                  key={link.id}
                  link={link}
                  categories={categories}
                  onToggleFavorite={handleToggleFavorite}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onDragStart={canManualDrag ? handleDragStart : undefined}
                  onDragOver={canManualDrag ? handleDragOver : undefined}
                  onDragLeave={canManualDrag ? dragLeave : undefined}
                  onDragEnd={canManualDrag ? dragEnd : undefined}
                  onDrop={canManualDrag ? handleDrop : undefined}
                  isDragging={dragState.draggedLink?.id === link.id}
                  isDropZone={dragState.dropZoneId === link.id && dragState.draggedLink !== null}
                  dragDirection={dragState.dragDirection}
                  isSelected={selectedIds.has(link.id)}
                  onToggleSelect={handleToggleSelect}
                  linkStatus={linkCheckResults[link.id]?.status}
                />
              ))}
            </div>
          )}
          </Suspense>
          </div>
        </main>

        {/* Drag & Drop Overlay com Undo/Redo */}
        <DragDropOverlay
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          isDragging={dragState.draggedLink !== null}
        />
      </div>

      <Suspense fallback={null}>
        <LinkForm
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setEditingLink(null);
          }}
          categories={categories}
          links={links}
          editingLink={editingLink}
          onSubmit={handleSubmit}
          onEditDuplicate={(link) => {
            setEditingLink(link);
            setFormOpen(true);
          }}
        />

        <StatsDashboard isOpen={statsOpen} onClose={() => setStatsOpen(false)} links={links} />

        <ExportFormatDialog isOpen={exportOpen} onClose={() => setExportOpen(false)} links={links} categories={categories} />

        <ImportFormatDialog isOpen={importOpen} onClose={() => setImportOpen(false)} onImport={handleImportLinks} />

        <ActivityPanel isOpen={historyOpen} onClose={() => setHistoryOpen(false)} entries={activityEntries} onClear={clearLog} />

        <TrashView
          isOpen={trashOpen}
          onClose={() => setTrashOpen(false)}
          trashedLinks={trashedLinks}
          onRestore={(id) => {
            const link = links.find((l) => l.id === id) ?? trashedLinks.find((l) => l.id === id);
            restoreLink(id);
            logActivity("link:restored", link?.title || "Link restaurado", link?.url);
          }}
          onPermanentDelete={(id) => {
            const link = trashedLinks.find((l) => l.id === id);
            permanentDeleteLink(id);
            logActivity("link:deleted", link?.title || "Link excluído", link?.url);
          }}
          onEmptyTrash={() => {
            emptyTrash();
            logActivity("link:deleted", `${trashedLinks.length} links excluídos permanentemente`);
          }}
        />
      </Suspense>

      <CommandPalette isOpen={commandOpen} onOpenChange={setCommandOpen} actions={commands} />

      <BatchActionBar
        selectedCount={selectedIds.size}
        categories={categories}
        onClearSelection={handleClearSelection}
        onBatchDelete={handleBatchDelete}
        onBatchFavorite={handleBatchFavorite}
        onBatchUnfavorite={handleBatchUnfavorite}
        onBatchMove={handleBatchMove}
        onBatchStatus={handleBatchStatus}
        onBatchPriority={handleBatchPriority}
        onBatchTag={handleBatchTag}
        onBatchRemoveTag={handleBatchRemoveTag}
        onSelectAll={handleSelectAll}
        selectedTags={(() => {
          const tagSet = new Set<string>();
          selectedIds.forEach((id) => {
            const link = links.find((l) => l.id === id);
            link?.tags.forEach((t) => tagSet.add(t));
          });
          return Array.from(tagSet).sort();
        })()}
      />

      <Suspense fallback={null}>
        <LinkCheckerPanel
          isOpen={linkCheckerOpen}
          onClose={() => setLinkCheckerOpen(false)}
          links={links}
          results={linkCheckResults}
          checking={linkChecking}
          progress={linkCheckProgress}
          onCheckAll={() => checkLinks(links.map((l) => ({ id: l.id, url: l.url })))}
          onCancel={cancelLinkCheck}
          onClear={clearLinkCheckResults}
        />

        <NotionSettingsDialog open={notionSettingsOpen} onOpenChange={setNotionSettingsOpen} />

        {diagnosticsOpen && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
            <div className="fixed inset-4 z-50 overflow-auto">
              <div className="container max-w-4xl mx-auto py-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">Diagnóstico de Links</h2>
                  <Button variant="outline" onClick={() => setDiagnosticsOpen(false)}>
                    Fechar
                  </Button>
                </div>
                <LinkDiagnostics links={links} onUpdateLink={updateLink} />
              </div>
            </div>
          </div>
        )}
      </Suspense>
    </SidebarProvider>
  );
};

export default Index;
