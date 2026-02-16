import { useState } from "react";
import { Plus, LayoutGrid, List, Download, Upload, LogOut, BarChart3 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LinkCard } from "@/components/LinkCard";
import { LinkForm } from "@/components/LinkForm";
import { SearchBar } from "@/components/SearchBar";
import { StatsDashboard } from "@/components/StatsDashboard";
import { ExportFormatDialog } from "@/components/ExportFormatDialog";
import { ImportFormatDialog } from "@/components/ImportFormatDialog";
import { Button } from "@/components/ui/button";
import { useLinks } from "@/hooks/use-links";
import { toast } from "sonner";
import type { LinkItem, SearchFilters } from "@/types/link";
import type { User } from "@supabase/supabase-js";

interface IndexProps {
  user: User;
  onSignOut: () => void;
}

const Index = ({ user, onSignOut }: IndexProps) => {
  const {
    links,
    categories,
    allTags,
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
    reorderLinks,
  } = useLinks(user.id);

  const [formOpen, setFormOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [draggedLink, setDraggedLink] = useState<LinkItem | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const filteredLinks = getFilteredLinks();

  const handleSubmit = (data: Omit<LinkItem, "id" | "createdAt" | "position">) => {
    if (editingLink) {
      updateLink(editingLink.id, data);
    } else {
      addLink(data);
    }
    setEditingLink(null);
  };

  const handleEdit = (link: LinkItem) => {
    setEditingLink(link);
    setFormOpen(true);
  };

  // ✅ Handlers para Drag & Drop
  const handleDragStart = (e: React.DragEvent, link: LinkItem) => {
    if (searchFilters.sort !== "manual") {
      toast.info("Mude a ordenação para Manual para reordenar");
      return;
    }
    setDraggedLink(link);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetLink: LinkItem) => {
    e.preventDefault();
    
    if (searchFilters.sort !== "manual") {
      toast.info("Mude a ordenação para Manual para reordenar");
      return;
    }

    if (!draggedLink || draggedLink.id === targetLink.id) {
      setDraggedLink(null);
      return;
    }

    // Encontrar índices dos links na lista filtrada
    const draggedIndex = filteredLinks.findIndex(l => l.id === draggedLink.id);
    const targetIndex = filteredLinks.findIndex(l => l.id === targetLink.id);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedLink(null);
      return;
    }

    // Criar nova lista com os links reordenados
    const newFilteredLinks = [...filteredLinks];
    const [movedLink] = newFilteredLinks.splice(draggedIndex, 1);
    newFilteredLinks.splice(targetIndex, 0, movedLink);

    // Reordenar mantendo a ordem global e evitando posições duplicadas
    const allOrdered = [...links].sort((a, b) => a.position - b.position);
    const filteredIdSet = new Set(newFilteredLinks.map((l) => l.id));
    let nextFilteredIndex = 0;

    const merged = allOrdered.map((link) => {
      if (!filteredIdSet.has(link.id)) return link;
      const next = newFilteredLinks[nextFilteredIndex++];
      return next ? { ...next } : link;
    });

    const reorderedAllLinks = merged.map((link, index) => ({
      ...link,
      position: index,
    }));

    // Chamar função para salvar no banco
    reorderLinks(reorderedAllLinks);
    setDraggedLink(null);
    toast.success("Links reordenados!");
  };

  const handleImportLinks = async (
    importedLinks: Omit<LinkItem, "id" | "createdAt" | "position">[]
  ) => {
    let successCount = 0;
    let errorCount = 0;

    for (const linkData of importedLinks) {
      try {
        await addLink(linkData);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    if (errorCount > 0) {
      toast.warning(`⚠️ ${errorCount} link(s) falharam`);
    }
  };

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
          activeFilter={{ type: "all" }}
          onFilterChange={() => {}}
          onAddCategory={addCategory}
          onDeleteCategory={deleteCategory}
          onRenameCategory={renameCategory}
        />

        <main className="flex-1 p-6">
          {/* Header */}
          <header className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="text-2xl font-bold tracking-tight">{filterLabel}</h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              >
                {viewMode === "grid" ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={() => setStatsOpen(true)} title="Ver estatísticas">
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setExportOpen(true)} title="Exportar links">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setImportOpen(true)} title="Importar links">
                <Upload className="h-4 w-4" />
              </Button>
              <Button onClick={() => { setEditingLink(null); setFormOpen(true); }}>
                <Plus className="mr-1.5 h-4 w-4" />
                Novo Link
              </Button>
              <Button variant="ghost" size="icon" onClick={onSignOut} title="Sair">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>

          {/* Advanced Search Bar */}
          <SearchBar
            filters={searchFilters}
            onFiltersChange={setSearchFilters}
            categories={categories}
            allTags={allTags}
          />

          {/* Links Grid/List */}
          <div className="mt-6">
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
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  : "flex flex-col gap-3"
              }
            >
              {filteredLinks.map((link) => (
                <LinkCard
                  key={link.id}
                  link={link}
                  onToggleFavorite={toggleFavorite}
                  onEdit={handleEdit}
                  onDelete={deleteLink}
                  onDragStart={searchFilters.sort === "manual" ? handleDragStart : undefined}
                  onDragOver={searchFilters.sort === "manual" ? handleDragOver : undefined}
                  onDrop={searchFilters.sort === "manual" ? handleDrop : undefined}
                  isDragging={draggedLink?.id === link.id}
                />
              ))}
            </div>
          )}
          </div>
        </main>
      </div>

      <LinkForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingLink(null);
        }}
        categories={categories}
        editingLink={editingLink}
        onSubmit={handleSubmit}
      />

      <StatsDashboard isOpen={statsOpen} onClose={() => setStatsOpen(false)} />

      <ExportFormatDialog isOpen={exportOpen} onClose={() => setExportOpen(false)} links={links} />

      <ImportFormatDialog isOpen={importOpen} onClose={() => setImportOpen(false)} onImport={handleImportLinks} />
    </SidebarProvider>
  );
};

export default Index;
