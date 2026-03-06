import { ExternalLink, GripVertical, Pencil, ShieldAlert, Star, Trash2 } from "lucide-react";
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
import { COMPACT_BADGE_CLASS, ICON_BTN_MD_CLASS, TEXT_XS_CLASS } from "@/lib/utils";
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

function statusLabel(status: LinkItem["status"]): string {
  if (status === "in_progress") return "Em progresso";
  if (status === "done") return "Concluído";
  return "Backlog";
}

function priorityLabel(priority: LinkItem["priority"]): string {
  if (priority === "high") return "Alta";
  if (priority === "low") return "Baixa";
  return "Média";
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
    <div className="flex flex-col gap-3">
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
            className={`group relative grid grid-cols-1 md:grid-cols-[1fr_320px] overflow-hidden rounded-2xl border bg-card transition-all duration-200 ${
              dragEnabled ? "cursor-grab active:cursor-grabbing" : ""
            } ${
              isSelected ? "ring-2 ring-primary border-primary" : "border-border/60"
            } ${
              isDragging ? "opacity-30 scale-[0.99]" : "hover:border-border hover:shadow-md"
            } ${
              isDropZone ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/10" : ""
            }`}
          >
            {isDropZone && dragDirection === "above" && (
              <div className="absolute top-0 left-2 right-2 z-10 h-[3px] rounded-full bg-primary" />
            )}
            {isDropZone && dragDirection === "below" && (
              <div className="absolute bottom-0 left-2 right-2 z-10 h-[3px] rounded-full bg-primary" />
            )}

            <div className="relative p-4 md:p-5">
              <div className="flex items-start gap-3">
                <div className="pt-1 text-muted-foreground/70 opacity-0 transition-opacity group-hover:opacity-100">
                  <GripVertical className="h-4 w-4" />
                </div>

                {onToggleSelect && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelect(link.id, e.shiftKey);
                    }}
                    className={`mt-1 h-5 w-5 shrink-0 rounded border-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/40 bg-background opacity-0 group-hover:opacity-100"
                    }`}
                  />
                )}

                <div className="min-w-0 flex-1">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex max-w-full items-center gap-1.5 text-lg font-semibold text-foreground transition-colors hover:text-primary md:text-2xl"
                  >
                    {health === "broken" && <ShieldAlert className="h-4 w-4 shrink-0 text-destructive" />}
                    <span className="truncate">{link.title || domain}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-50" />
                  </a>

                  {link.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground md:text-base">
                      {link.description}
                    </p>
                  )}

                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-sm text-foreground/90 hover:text-primary"
                  >
                    <FaviconWithFallback url={link.url} favicon={link.favicon} size={16} />
                    <span className="truncate">{link.url}</span>
                  </a>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Badge variant={link.status === "done" ? "default" : link.status === "in_progress" ? "secondary" : "outline"} className={COMPACT_BADGE_CLASS}>
                      {statusLabel(link.status)}
                    </Badge>
                    <Badge variant={link.priority === "high" ? "destructive" : link.priority === "medium" ? "secondary" : "outline"} className={COMPACT_BADGE_CLASS}>
                      {priorityLabel(link.priority)}
                    </Badge>
                    {link.category && (
                      <Badge variant="secondary" className={COMPACT_BADGE_CLASS}>
                        {link.category}
                      </Badge>
                    )}
                    {link.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className={COMPACT_BADGE_CLASS}>
                        {tag}
                      </Badge>
                    ))}
                    {link.dueDate && (
                      <Badge variant="outline" className={COMPACT_BADGE_CLASS}>
                        {new Date(link.dueDate).toLocaleDateString("pt-BR")}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button variant="ghost" size="icon" className={ICON_BTN_MD_CLASS} onClick={() => onToggleFavorite(link.id)}>
                  <Star className={`h-4 w-4 ${link.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                </Button>
                <Button variant="ghost" size="icon" className={ICON_BTN_MD_CLASS} onClick={() => onEdit(link)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className={`${ICON_BTN_MD_CLASS} text-destructive`}>
                      <Trash2 className="h-4 w-4" />
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

            <div className="relative min-h-[140px] border-t bg-muted/30 md:min-h-[160px] md:border-l md:border-t-0">
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
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FaviconWithFallback url={link.url} favicon={link.favicon} size={28} />
                    <span className={TEXT_XS_CLASS}>{domain}</span>
                  </div>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
