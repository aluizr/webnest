import { Star, ExternalLink, Pencil, Trash2, StickyNote, GripVertical, Globe } from "lucide-react";
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
import { COMPACT_BADGE_CLASS, ICON_BTN_MD_CLASS, ICON_BTN_SM_CLASS, TEXT_XS_CLASS } from "@/lib/utils";
import type { LinkItem } from "@/types/link";
import type { CardSize } from "@/components/ViewSwitcher";

// --- Size-responsive config ---

const gridClasses: Record<CardSize, string> = {
  sm: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3",
  md: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4",
  lg: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-5",
};

const coverHeight: Record<CardSize, string> = {
  sm: "h-28",
  md: "h-36",
  lg: "h-44",
};

const placeholderIcon: Record<CardSize, string> = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

const titleClasses: Record<CardSize, string> = {
  sm: `${TEXT_XS_CLASS} leading-tight`,
  md: "text-sm leading-snug",
  lg: "text-base leading-snug",
};

const descLines: Record<CardSize, string> = {
  sm: "line-clamp-1 text-[10px]",
  md: `line-clamp-2 ${TEXT_XS_CLASS}`,
  lg: "line-clamp-2 text-sm",
};

const badgeClasses: Record<CardSize, string> = {
  sm: "text-[9px] px-1.5 py-0 h-4",
  md: COMPACT_BADGE_CLASS,
  lg: `${TEXT_XS_CLASS} px-2 py-0.5 h-5`,
};

const domainClasses: Record<CardSize, string> = {
  sm: "text-[10px]",
  md: "text-[11px]",
  lg: TEXT_XS_CLASS,
};

const faviconSizes: Record<CardSize, number> = { sm: 12, md: 14, lg: 16 };
const maxTags: Record<CardSize, number> = { sm: 1, md: 2, lg: 3 };
const actionBtnSize: Record<CardSize, string> = {
  sm: ICON_BTN_SM_CLASS,
  md: ICON_BTN_MD_CLASS,
  lg: "h-8 w-8",
};
const actionIconSize: Record<CardSize, string> = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
};
const padClasses: Record<CardSize, string> = {
  sm: "px-2.5 py-2",
  md: "px-3 py-2.5",
  lg: "px-4 py-3",
};

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

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
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string, shiftKey?: boolean) => void;
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
  selectedIds,
  onToggleSelect,
}: LinkCardsViewProps) {
  const visibleTags = maxTags[cardSize];
  const dragEnabled = Boolean(onDragStart);

  return (
    <div className={`grid ${gridClasses[cardSize]}`}>
      {links.map((link) => {
        const isDragging = draggedLinkId === link.id;
        const isDropZone = dropZoneId === link.id && draggedLinkId !== null && !isDragging;
        const isSelected = selectedIds?.has(link.id);
        const hostname = getHostname(link.url);

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
            className={`group relative rounded-xl border bg-card overflow-hidden transition-all duration-200
              ${isDragging
                ? "opacity-25 scale-[0.97] shadow-none border-dashed border-primary/40 bg-primary/5"
                : ""
              }
              ${!isDragging && dragEnabled ? "snap-animate" : ""}
              ${isDropZone
                ? "border-primary/50 bg-primary/10 shadow-lg shadow-primary/10 scale-[1.02] ring-1 ring-primary/30"
                : !isDragging
                  ? "hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 border-border/60 hover:border-border"
                  : ""
              }
              ${isSelected ? "ring-2 ring-primary border-primary" : ""}
              ${dragEnabled ? "cursor-grab active:cursor-grabbing" : ""}
            `}
          >
            {/* Drop zone indicators */}
            {isDropZone && dragDirection === "above" && (
              <div className="absolute top-0 left-2 right-2 h-[3px] bg-primary rounded-full animate-pulse shadow-[0_0_8px_hsl(var(--primary)/0.6)] z-10" />
            )}
            {isDropZone && dragDirection === "below" && (
              <div className="absolute bottom-0 left-2 right-2 h-[3px] bg-primary rounded-full animate-pulse shadow-[0_0_8px_hsl(var(--primary)/0.6)] z-10" />
            )}

            {/* Cover image area */}
            <div className={`relative ${coverHeight[cardSize]} bg-muted/40 overflow-hidden`}>
              {/* Selection checkbox */}
              {onToggleSelect && (
                <button
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggleSelect(link.id, e.shiftKey); }}
                  className={`absolute top-1.5 left-1.5 z-20 h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-black/30 backdrop-blur-sm border-white/50 opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {isSelected && (
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              )}
              {link.ogImage ? (
                <img
                  src={link.ogImage}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (e.currentTarget.parentElement as HTMLElement).classList.add("no-image");
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/60 to-muted/30">
                  <Globe className={`${placeholderIcon[cardSize]} text-muted-foreground/30`} />
                </div>
              )}

              {/* Favorite star — overlaid on cover */}
              <Button
                variant="ghost"
                size="icon"
                className={`absolute top-1.5 left-1.5 ${actionBtnSize[cardSize]} rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-all ${
                  link.isFavorite ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
                onClick={() => onToggleFavorite(link.id)}
              >
                <Star
                  className={`${actionIconSize[cardSize]} ${
                    link.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-white/80"
                  }`}
                />
              </Button>

              {/* Grip handle — overlaid on cover */}
              {dragEnabled && (
                <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className={`${actionBtnSize[cardSize]} rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center`}>
                    <GripVertical className={`${actionIconSize[cardSize]} text-white/80`} />
                  </div>
                </div>
              )}

              {/* Hover actions — overlaid bottom-right of cover */}
              <div className="absolute bottom-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center ${actionBtnSize[cardSize]} rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-colors`}
                >
                  <ExternalLink className={`${actionIconSize[cardSize]} text-white/80`} />
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`${actionBtnSize[cardSize]} rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50`}
                  onClick={() => onEdit(link)}
                >
                  <Pencil className={`${actionIconSize[cardSize]} text-white/80`} />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`${actionBtnSize[cardSize]} rounded-full bg-black/30 backdrop-blur-sm hover:bg-red-500/70`}
                    >
                      <Trash2 className={`${actionIconSize[cardSize]} text-white/80`} />
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

            {/* Content section — below cover */}
            <div className={`${padClasses[cardSize]} flex flex-col gap-1.5`}>
              {/* Title */}
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${titleClasses[cardSize]} font-semibold text-foreground hover:text-primary transition-colors line-clamp-2`}
              >
                {link.title || hostname}
              </a>

              {/* Description */}
              {link.description && (
                <p className={`${descLines[cardSize]} text-muted-foreground`}>
                  {link.description}
                </p>
              )}

              {/* Domain row: favicon + hostname + notes */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <FaviconWithFallback url={link.url} favicon={link.favicon} size={faviconSizes[cardSize]} />
                <span className={`${domainClasses[cardSize]} text-muted-foreground truncate`}>
                  {hostname}
                </span>
                {link.notes && (
                  <StickyNote className="h-3 w-3 text-muted-foreground/60 shrink-0 ml-auto" />
                )}
              </div>

              {/* Tags + category */}
              {(link.category || link.tags.length > 0) && (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {link.category && (
                    <Badge variant="secondary" className={`${badgeClasses[cardSize]} font-normal`}>
                      {link.category}
                    </Badge>
                  )}
                  {link.tags.slice(0, visibleTags).map((tag) => (
                    <Badge key={tag} variant="outline" className={`${badgeClasses[cardSize]} font-normal text-muted-foreground`}>
                      #{tag}
                    </Badge>
                  ))}
                  {link.tags.length > visibleTags && (
                    <span className="text-[10px] text-muted-foreground self-center">+{link.tags.length - visibleTags}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
