import { useMemo } from "react";
import { Star, ExternalLink, Pencil, Trash2, StickyNote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FaviconWithFallback } from "@/components/FaviconWithFallback";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { LinkItem, Category } from "@/types/link";

interface LinkBoardViewProps {
  links: LinkItem[];
  categories: Category[];
  onToggleFavorite: (id: string) => void;
  onEdit: (link: LinkItem) => void;
  onDelete: (id: string) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string, shiftKey?: boolean) => void;
}

export function LinkBoardView({ links, categories, onToggleFavorite, onEdit, onDelete, selectedIds, onToggleSelect }: LinkBoardViewProps) {
  // Agrupar links por categoria (top-level), com subcategorias como seções
  const columns = useMemo(() => {
    const grouped = new Map<string, { subcategories: Map<string, LinkItem[]> }>();

    // "Sem categoria" sempre primeiro
    grouped.set("", { subcategories: new Map([["", []]]) });

    // Criar colunas para categorias top-level
    const parentCategories = categories.filter((c) => !c.parentId)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    for (const cat of parentCategories) {
      grouped.set(cat.name, { subcategories: new Map([["", []]]) });
    }

    // Distribuir links nas colunas, separando por subcategoria
    for (const link of links) {
      const categoryKey = link.category || "";
      const parts = categoryKey.split(" / ");
      const topLevel = parts[0] || "";
      const subCategory = parts.length > 1 ? parts.slice(1).join(" / ") : "";

      if (grouped.has(topLevel)) {
        const col = grouped.get(topLevel)!;
        if (!col.subcategories.has(subCategory)) {
          col.subcategories.set(subCategory, []);
        }
        col.subcategories.get(subCategory)!.push(link);
      } else {
        grouped.get("")!.subcategories.get("")!.push(link);
      }
    }

    // Build result
    const result: { name: string; color?: string | null; sections: { name: string; links: LinkItem[] }[] }[] = [];
    for (const [name, col] of grouped) {
      const totalLinks = Array.from(col.subcategories.values()).reduce((sum, arr) => sum + arr.length, 0);
      if (totalLinks > 0 || name === "") {
        const cat = parentCategories.find((c) => c.name === name);
        const sections = Array.from(col.subcategories.entries())
          .filter(([, items]) => items.length > 0 || name === "")
          .map(([subName, items]) => ({ name: subName, links: items }));
        result.push({
          name: name || "Sem categoria",
          color: cat?.color,
          sections,
        });
      }
    }

    return result;
  }, [links, categories]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-3 px-3 md:-mx-6 md:px-6 snap-x">
      {columns.map((column) => {
        const allLinks = column.sections.flatMap((s) => s.links);
        return (
        <div
          key={column.name}
          className="flex-shrink-0 w-72 snap-start"
        >
          {/* Column header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-1.5">
              {column.color && (
                <div
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: column.color }}
                />
              )}
              <h3 className="font-semibold text-sm text-foreground truncate">
                {column.name}
              </h3>
            </div>
            <Badge variant="secondary" className="text-xs ml-2 shrink-0">
              {allLinks.length}
            </Badge>
          </div>

          {/* Column cards grouped by subcategory */}
          <div className="flex flex-col gap-2">
            {column.sections.map((section) => (
              <div key={section.name || "__root__"}>
                {/* Subcategory label */}
                {section.name && (
                  <div className="px-1 pb-1 pt-2">
                    <p className="text-xs font-medium text-muted-foreground">{section.name}</p>
                  </div>
                )}
                {section.links.map((link) => (
              <Card key={link.id} className={`group relative overflow-hidden border hover:shadow-md transition-shadow ${
                selectedIds?.has(link.id) ? "ring-2 ring-primary border-primary" : ""
              }`}>
                {/* OG Image mini cover */}
                {link.ogImage && (
                  <div className="w-full h-24 overflow-hidden bg-muted">
                    <img
                      src={link.ogImage}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                )}

                <CardContent className="p-3">
                  {/* Selection checkbox */}
                  {onToggleSelect && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleSelect(link.id, e.shiftKey); }}
                      className={`absolute top-2 left-2 z-20 h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
                        selectedIds?.has(link.id)
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-background/80 border-muted-foreground/40 opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      {selectedIds?.has(link.id) && (
                        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  )}
                  <div className="flex items-start gap-2">
                    <FaviconWithFallback url={link.url} favicon={link.favicon} size={18} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors line-clamp-2"
                      >
                        {link.title || link.url}
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-40" />
                      </a>

                      {link.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {link.description}
                        </p>
                      )}

                      {/* Tags */}
                      {link.tags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {link.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))}
                          {link.tags.length > 2 && (
                            <span className="text-[10px] text-muted-foreground">+{link.tags.length - 2}</span>
                          )}
                        </div>
                      )}

                      {link.notes && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground mt-1" title={link.notes}>
                          <StickyNote className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions - hover */}
                  <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-md p-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onToggleFavorite(link.id)}
                    >
                      <Star
                        className={`h-3 w-3 ${link.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                      />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(link)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir link?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O link será removido permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => onDelete(link.id)}
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
              </div>
            ))}

            {allLinks.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 p-6 text-center">
                <p className="text-xs text-muted-foreground">Nenhum link</p>
              </div>
            )}
          </div>
        </div>
        );
      })}
    </div>
  );
}
