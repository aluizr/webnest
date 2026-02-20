import { Star, ExternalLink, Pencil, Trash2, StickyNote } from "lucide-react";
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
import type { LinkItem } from "@/types/link";

interface LinkTableViewProps {
  links: LinkItem[];
  onToggleFavorite: (id: string) => void;
  onEdit: (link: LinkItem) => void;
  onDelete: (id: string) => void;
}

export function LinkTableView({ links, onToggleFavorite, onEdit, onDelete }: LinkTableViewProps) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left font-medium px-4 py-3 w-8"></th>
              <th className="text-left font-medium px-4 py-3">Título</th>
              <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Descrição</th>
              <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">Categoria</th>
              <th className="text-left font-medium px-4 py-3 hidden lg:table-cell">Tags</th>
              <th className="text-left font-medium px-4 py-3 hidden lg:table-cell">Data</th>
              <th className="text-right font-medium px-4 py-3 w-28">Ações</th>
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr
                key={link.id}
                className="border-b last:border-b-0 hover:bg-muted/30 transition-colors group"
              >
                {/* Favicon */}
                <td className="px-4 py-3">
                  <FaviconWithFallback url={link.url} favicon={link.favicon} size={20} />
                </td>

                {/* Title + URL */}
                <td className="px-4 py-3 max-w-[280px]">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 font-medium text-foreground hover:text-primary transition-colors truncate"
                  >
                    {link.title || link.url}
                    <ExternalLink className="h-3 w-3 shrink-0 opacity-40" />
                  </a>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {new URL(link.url).hostname}
                  </p>
                </td>

                {/* Description */}
                <td className="px-4 py-3 hidden md:table-cell max-w-[200px]">
                  <p className="text-muted-foreground truncate text-xs">
                    {link.description || "—"}
                  </p>
                  {link.notes && (
                    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground mt-0.5" title={link.notes}>
                      <StickyNote className="h-3 w-3" />
                    </span>
                  )}
                </td>

                {/* Category */}
                <td className="px-4 py-3 hidden sm:table-cell">
                  {link.category ? (
                    <Badge variant="secondary" className="text-xs">
                      {link.category}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>

                {/* Tags */}
                <td className="px-4 py-3 hidden lg:table-cell">
                  <div className="flex flex-wrap gap-1 max-w-[180px]">
                    {link.tags.length > 0 ? (
                      link.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                    {link.tags.length > 3 && (
                      <span className="text-xs text-muted-foreground">+{link.tags.length - 3}</span>
                    )}
                  </div>
                </td>

                {/* Date */}
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(link.createdAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onToggleFavorite(link.id)}
                    >
                      <Star
                        className={`h-3.5 w-3.5 ${link.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                      />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(link)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
