import { useState, useMemo } from "react";
import { Plus, Search, LayoutGrid, List, Download, Upload } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LinkCard } from "@/components/LinkCard";
import { LinkForm } from "@/components/LinkForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLinks } from "@/hooks/use-links";
import { toast } from "sonner";
import type { LinkItem } from "@/types/link";

type FilterType = { type: "all" | "favorites" | "category" | "tag"; value?: string };

const Index = () => {
  const {
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
  } = useLinks();

  const [filter, setFilter] = useState<FilterType>({ type: "all" });
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredLinks = useMemo(() => {
    let result = links;

    // Filter
    if (filter.type === "favorites") {
      result = result.filter((l) => l.isFavorite);
    } else if (filter.type === "category" && filter.value) {
      result = result.filter((l) => l.category === filter.value);
    } else if (filter.type === "tag" && filter.value) {
      result = result.filter((l) => l.tags.includes(filter.value!));
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.url.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q)
      );
    }

    return result;
  }, [links, filter, search]);

  const handleSubmit = (data: Omit<LinkItem, "id" | "createdAt">) => {
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

  const handleExport = () => {
    const data = JSON.stringify(links, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `links-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup exportado com sucesso!");
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = JSON.parse(text) as LinkItem[];
        if (!Array.isArray(imported)) throw new Error("Formato inválido");
        let count = 0;
        for (const item of imported) {
          if (!item.url) continue;
          await addLink({
            url: item.url,
            title: item.title || item.url,
            description: item.description || "",
            category: item.category || "",
            tags: item.tags || [],
            isFavorite: item.isFavorite || false,
            favicon: item.favicon || "",
          });
          count++;
        }
        toast.success(`${count} link(s) importado(s) com sucesso!`);
      } catch {
        toast.error("Erro ao importar: arquivo JSON inválido.");
      }
    };
    input.click();
  };

  const filterLabel =
    filter.type === "all"
      ? "Todos os Links"
      : filter.type === "favorites"
        ? "Favoritos"
        : filter.value || "";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar
          categories={categories}
          allTags={allTags}
          activeFilter={filter}
          onFilterChange={setFilter}
          onAddCategory={addCategory}
          onDeleteCategory={deleteCategory}
          onRenameCategory={renameCategory}
        />

        <main className="flex-1 p-6">
          {/* Header */}
          <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="text-2xl font-bold tracking-tight">{filterLabel}</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar links..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              >
                {viewMode === "grid" ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={handleExport} title="Exportar links">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleImport} title="Importar links">
                <Upload className="h-4 w-4" />
              </Button>
              <Button onClick={() => { setEditingLink(null); setFormOpen(true); }}>
                <Plus className="mr-1.5 h-4 w-4" />
                Novo Link
              </Button>
            </div>
          </header>

          {/* Links */}
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
                />
              ))}
            </div>
          )}
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
    </SidebarProvider>
  );
};

export default Index;
