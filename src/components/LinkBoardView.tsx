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
}

export function LinkBoardView({ links, categories, onToggleFavorite, onEdit, onDelete }: LinkBoardViewProps) {
  // Agrupar links por categoria (top-level)
  const columns = useMemo(() => {
    const grouped = new Map<string, LinkItem[]>();

    // "Sem categoria" sempre primeiro
    grouped.set("", []);

    // Criar colunas para categorias top-level que têm links
    const parentCategories = categories.filter((c) => !c.parentId);
    for (const cat of parentCategories) {
      grouped.set(cat.name, []);
    }

    // Distribuir links nas colunas
    for (const link of links) {
      const categoryKey = link.category || "";
      // Para subcategorias "Parent / Child", agrupar pelo parent
      const topLevel = categoryKey.includes(" / ") ? categoryKey.split(" / ")[0] : categoryKey;

      if (grouped.has(topLevel)) {
        grouped.get(topLevel)!.push(link);
      } else {
        // Categoria não existe mais, colocar em "Sem categoria"
        grouped.get("")!.push(link);
      }
    }

    // Filtrar colunas vazias (exceto "Sem categoria" se tiver links)
    const result: { name: string; links: LinkItem[] }[] = [];
    for (const [name, items] of grouped) {
      if (items.length > 0 || name === "") {
        result.push({ name: name || "Sem categoria", links: items });
      }
    }

    return result;
  }, [links, categories]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-3 px-3 md:-mx-6 md:px-6 snap-x">
      {columns.map((column) => (
        <div
          key={column.name}
          className="flex-shrink-0 w-72 snap-start"
        >
          {/* Column header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-semibold text-sm text-foreground truncate">
              {column.name}
            </h3>
            <Badge variant="secondary" className="text-xs ml-2 shrink-0">
              {column.links.length}
            </Badge>
          </div>

          {/* Column cards */}
          <div className="flex flex-col gap-2">
            {column.links.map((link) => (
              <Card key={link.id} className="group relative overflow-hidden border hover:shadow-md transition-shadow">
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

            {column.links.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 p-6 text-center">
                <p className="text-xs text-muted-foreground">Nenhum link</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
