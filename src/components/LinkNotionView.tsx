import { ExternalLink, GripVertical, Pencil, ShieldAlert, Star, Trash2 } from "lucide-react";
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
import { ICON_BTN_MD_CLASS, TEXT_XS_CLASS } from "@/lib/utils";
import type { LinkItem } from "@/types/link";

interface LinkNotionViewProps {
  links: LinkItem[];
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
  linkStatusById?: Record<string, "unknown" | "checking" | "ok" | "broken" | "error" | undefined>;
}

function safeDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function LinkNotionView({
  links,
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
  linkStatusById,
}: LinkNotionViewProps) {
  const dragEnabled = Boolean(onDragStart);

  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-background">
      {links.map((link) => {
        const isDragging = draggedLinkId === link.id;
        const isDropZone = dropZoneId === link.id && draggedLinkId !== null && !isDragging;
        const isSelected = selectedIds?.has(link.id);
        const domain = safeDomain(link.url);
        const health = linkStatusById?.[link.id];

        return (
          <article
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
            className={`group relative grid min-h-[126px] grid-cols-2 items-stretch overflow-hidden border-b border-border/60 bg-background transition-colors duration-150 last:border-b-0 ${
              dragEnabled ? "cursor-grab active:cursor-grabbing" : ""
            } ${
              isSelected ? "bg-primary/5" : ""
            } ${
              isDragging ? "opacity-30" : "hover:bg-muted/30"
            } ${
              isDropZone ? "bg-primary/10" : ""
            }`}
          >
            {isDropZone && dragDirection === "above" && (
              <div className="absolute top-0 left-2 right-2 z-10 h-[3px] rounded-full bg-primary" />
            )}
            {isDropZone && dragDirection === "below" && (
              <div className="absolute bottom-0 left-2 right-2 z-10 h-[3px] rounded-full bg-primary" />
            )}

            <div className="relative min-w-0 flex-1 p-3 pr-2 md:p-3.5 md:pr-2.5">
              <div className="flex items-start gap-2.5">
                <div className="pt-0.5 text-muted-foreground/70 opacity-0 transition-opacity group-hover:opacity-100">
                  <GripVertical className="h-3.5 w-3.5" />
                </div>

                {onToggleSelect && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelect(link.id, e.shiftKey);
                    }}
                    className={`mt-0.5 h-4 w-4 shrink-0 rounded-sm border transition-all ${
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/40 bg-background opacity-0 group-hover:opacity-100"
                    }`}
                  />
                )}

                <div className="min-w-0 flex-1 pr-24 md:pr-20">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex max-w-full items-center gap-1.5 text-base font-semibold text-foreground transition-colors hover:text-primary"
                  >
                    {health === "broken" && <ShieldAlert className="h-4 w-4 shrink-0 text-destructive" />}
                    <span className="truncate">{link.title || domain}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 opacity-45" />
                  </a>

                  {link.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground/90">
                      {link.description}
                    </p>
                  )}

                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-foreground/90 hover:text-primary"
                  >
                    <FaviconWithFallback url={link.url} favicon={link.favicon} size={14} />
                    <span className="truncate">{domain}</span>
                  </a>
                </div>
              </div>

              <div className="absolute right-2 top-2 flex gap-0.5 opacity-100 transition-opacity md:right-3 md:top-3 md:opacity-0 md:group-hover:opacity-100">
                <Button variant="ghost" size="icon" className={`${ICON_BTN_MD_CLASS} h-8 w-8 md:h-7 md:w-7`} onClick={() => onToggleFavorite(link.id)}>
                  <Star className={`h-4 w-4 md:h-3.5 md:w-3.5 ${link.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                </Button>
                <Button variant="ghost" size="icon" className={`${ICON_BTN_MD_CLASS} h-8 w-8 md:h-7 md:w-7`} onClick={() => onEdit(link)}>
                  <Pencil className="h-4 w-4 md:h-3.5 md:w-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className={`${ICON_BTN_MD_CLASS} h-8 w-8 md:h-7 md:w-7 text-destructive`}>
                      <Trash2 className="h-4 w-4 md:h-3.5 md:w-3.5" />
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
                      <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => onDelete(link.id)}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <div className="relative flex min-w-0 items-center justify-center border-l bg-muted/10 p-3 pl-2 sm:p-3 sm:pl-2.5 md:p-3.5 md:pl-3">
              <div className="h-full w-full overflow-hidden rounded-md border border-border/50 bg-muted/20">
                {link.ogImage ? (
                  <img
                    src={link.ogImage}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <div className="flex flex-col items-center gap-1.5 px-1 text-muted-foreground">
                      <FaviconWithFallback url={link.url} favicon={link.favicon} size={16} />
                      <span className={`max-w-full truncate ${TEXT_XS_CLASS}`}>{domain}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
