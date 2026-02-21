import { Star, ExternalLink, Pencil, Trash2, StickyNote, GripVertical } from "lucide-react";
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
import type { CardSize } from "@/components/ViewSwitcher";

const gridClasses: Record<CardSize, string> = {
  sm: "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-1.5",
  md: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2",
  lg: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3",
};

const cardClasses: Record<CardSize, string> = {
  sm: "p-2 rounded-lg",
  md: "p-3 rounded-xl",
  lg: "p-4 rounded-xl",
};

const faviconSizes: Record<CardSize, number> = { sm: 20, md: 28, lg: 36 };
const titleClasses: Record<CardSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};
const descClasses: Record<CardSize, string> = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm line-clamp-2",
};
const badgeClasses: Record<CardSize, string> = {
  sm: "text-[9px] px-1 py-0",
  md: "text-[10px] px-1.5 py-0",
  lg: "text-xs px-2 py-0.5",
};
const actionSize: Record<CardSize, string> = {
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-7 w-7",
};
const actionIconSize: Record<CardSize, string> = {
  sm: "h-2.5 w-2.5",
  md: "h-3 w-3",
  lg: "h-3.5 w-3.5",
};
const maxTags: Record<CardSize, number> = { sm: 1, md: 2, lg: 3 };
const gripSize: Record<CardSize, string> = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

interface LinkCardsViewProps {
  links: LinkItem[];
  cardSize: CardSize;
  onToggleFavorite: (id: string) => void;
  onEdit: (link: LinkItem) => void;
  onDelete: (id: string) => void;
  onDragStart?: (e: React.DragEvent, link: LinkItem) => void;
  onDragOver?: (e: React.DragEvent, linkId: string) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, link: LinkItem) => void;
  draggedLinkId?: string | null;
  dropZoneId?: string | null;
  dragDirection?: "above" | "below";
}

export function LinkCardsView({
  links,
  cardSize,
  onToggleFavorite,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDragEnd,
  onDrop,
  draggedLinkId,
  dropZoneId,
  dragDirection,
}: LinkCardsViewProps) {
  const visibleTags = maxTags[cardSize];
  const dragEnabled = Boolean(onDragStart);

  return (
    <div className={`grid ${gridClasses[cardSize]}`}>
      {links.map((link) => {
        const isDragging = draggedLinkId === link.id;
        const isDropZone = dropZoneId === link.id && draggedLinkId !== null && !isDragging;

        return (
        <div
          key={link.id}
          draggable={dragEnabled}
          onDragStart={(e) => onDragStart?.(e, link)}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDragOver?.(e, link.id);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDrop?.(e, link);
          }}
          onDragLeave={(e) => {
            const relatedTarget = e.relatedTarget as HTMLElement;
            if (!e.currentTarget.contains(relatedTarget)) {
              onDragLeave?.(e);
            }
          }}
          onDragEnd={(e) => onDragEnd?.(e)}
          data-card-id={link.id}
          className={`group relative border bg-card ${cardClasses[cardSize]} hover:shadow-md transition-all duration-200 flex flex-col gap-1.5 ${
            isDragging
              ? "opacity-25 scale-[0.97] shadow-none border-dashed border-primary/40 bg-primary/5"
              : ""
          } ${
            isDropZone
              ? "border-primary/50 bg-primary/10 shadow-lg shadow-primary/10 scale-[1.02] ring-1 ring-primary/30"
              : !isDragging ? "hover:border-primary/30" : ""
          } ${
            dragEnabled ? "cursor-grab active:cursor-grabbing" : ""
          }`}
        >
          {/* Drop zone indicators */}
          {isDropZone && dragDirection === "above" && (
            <div className="absolute top-0 left-1 right-1 h-[3px] bg-primary rounded-full animate-pulse shadow-[0_0_8px_hsl(var(--primary)/0.6)] z-10" />
          )}
          {isDropZone && dragDirection === "below" && (
            <div className="absolute bottom-0 left-1 right-1 h-[3px] bg-primary rounded-full animate-pulse shadow-[0_0_8px_hsl(var(--primary)/0.6)] z-10" />
          )}

          {/* Top row: grip + favicon + favorite */}
          <div className="flex items-center justify-between gap-2">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 min-w-0 flex-1"
            >
              {dragEnabled && (
                <GripVertical className={`${gripSize[cardSize]} text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0`} />
              )}
              <FaviconWithFallback url={link.url} favicon={link.favicon} size={faviconSizes[cardSize]} className="shrink-0" />
              <span className={`${titleClasses[cardSize]} font-medium truncate text-foreground group-hover:text-primary transition-colors`}>
                {link.title || new URL(link.url).hostname}
              </span>
            </a>
            <Button
              variant="ghost"
              size="icon"
              className={`${actionSize[cardSize]} shrink-0 opacity-0 group-hover:opacity-100 transition-opacity`}
              onClick={() => onToggleFavorite(link.id)}
            >
              <Star
                className={`${actionIconSize[cardSize]} ${
                  link.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                }`}
              />
            </Button>
          </div>

          {/* Description */}
          {link.description && (
            <p className={`${descClasses[cardSize]} text-muted-foreground line-clamp-1`}>{link.description}</p>
          )}

          {/* Category + tags */}
          <div className="flex flex-wrap gap-1 min-h-[20px]">
            {link.category && (
              <Badge variant="secondary" className={badgeClasses[cardSize]}>
                {link.category}
              </Badge>
            )}
            {link.tags.slice(0, visibleTags).map((tag) => (
              <Badge key={tag} variant="outline" className={badgeClasses[cardSize]}>
                {tag}
              </Badge>
            ))}
            {link.tags.length > visibleTags && (
              <span className="text-[10px] text-muted-foreground">+{link.tags.length - visibleTags}</span>
            )}
            {link.notes && (
              <span className="inline-flex items-center text-muted-foreground" title="Tem notas">
                <StickyNote className="h-2.5 w-2.5" />
              </span>
            )}
          </div>

          {/* Hover actions */}
          <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center ${actionSize[cardSize]} rounded-md hover:bg-muted transition-colors`}
            >
              <ExternalLink className={`${actionIconSize[cardSize]} text-muted-foreground`} />
            </a>
            <Button variant="ghost" size="icon" className={actionSize[cardSize]} onClick={() => onEdit(link)}>
              <Pencil className={actionIconSize[cardSize]} />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className={`${actionSize[cardSize]} text-destructive`}>
                  <Trash2 className={actionIconSize[cardSize]} />
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
        </div>
        );
      })}
    </div>
  );
}
