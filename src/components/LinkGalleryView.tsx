import { Star, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ICON_BTN_MD_CLASS, TEXT_XS_CLASS } from "@/lib/utils";
import type { LinkItem, Category } from "@/types/link";

interface LinkGalleryViewProps {
  links: LinkItem[];
  categories?: Category[];
  onToggleFavorite: (id: string) => void;
  onEdit: (link: LinkItem) => void;
  onDelete: (id: string) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string, shiftKey?: boolean) => void;
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function LinkGalleryView({
  links,
  categories,
  onToggleFavorite,
  onEdit,
  onDelete,
  selectedIds,
  onToggleSelect,
}: LinkGalleryViewProps) {
  return (
    <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
      {links.map((link) => {
        const isSelected = selectedIds?.has(link.id);
        return (
          <div
            key={link.id}
            className={`group relative break-inside-avoid rounded-xl overflow-hidden border bg-card shadow-sm hover:shadow-lg transition-all duration-300 ${
              isSelected ? "ring-2 ring-primary border-primary" : ""
            }`}
          >
            {/* Selection checkbox */}
            {onToggleSelect && (
              <button
                onClick={(e) => onToggleSelect(link.id, e.shiftKey)}
                className={`absolute top-2 left-2 z-20 h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
                  isSelected
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-background/80 border-muted-foreground/40 opacity-0 group-hover:opacity-100"
                }`}
              >
                {isSelected && (
                  <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            )}

            {/* Cover image */}
            {link.ogImage ? (
              <div className="w-full overflow-hidden bg-muted">
                <img
                  src={link.ogImage}
                  alt=""
                  loading="lazy"
                  className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  style={{ minHeight: "160px", maxHeight: "320px" }}
                  onError={(e) => {
                    (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                  }}
                />
              </div>
            ) : (
              <div className="w-full h-32 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                <FaviconWithFallback url={link.url} favicon={link.favicon} size={48} />
              </div>
            )}

            {/* Favorite badge */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/70 backdrop-blur-sm hover:bg-background/90 z-10"
              onClick={() => onToggleFavorite(link.id)}
            >
              <Star
                className={`h-4 w-4 ${link.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
              />
            </Button>

            {/* Content */}
            <div className="p-3.5">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 font-semibold text-sm text-foreground hover:text-primary transition-colors line-clamp-2"
              >
                {link.title || link.url}
                <ExternalLink className="h-3 w-3 shrink-0 opacity-40" />
              </a>

              {link.description && (
                <p className={`mt-1 ${TEXT_XS_CLASS} text-muted-foreground line-clamp-2`}>
                  {link.description}
                </p>
              )}

              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <FaviconWithFallback url={link.url} favicon={link.favicon} size={12} />
                <span className="truncate">{getHostname(link.url)}</span>
              </div>

              {(link.category || link.tags.length > 0) && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {link.category && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      {link.category}
                    </Badge>
                  )}
                  {link.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      {tag}
                    </Badge>
                  ))}
                  {link.tags.length > 2 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      +{link.tags.length - 2}
                    </Badge>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="mt-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className={ICON_BTN_MD_CLASS} onClick={() => onEdit(link)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className={`${ICON_BTN_MD_CLASS} text-destructive`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir link?</AlertDialogTitle>
                      <AlertDialogDescription>
                        O link será movido para a lixeira.
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
            </div>
          </div>
        );
      })}
    </div>
  );
}
