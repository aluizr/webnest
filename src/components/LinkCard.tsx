import { Star, ExternalLink, Pencil, Trash2, GripVertical, StickyNote, ShieldAlert, Link as LinkIcon } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FaviconWithFallback } from "@/components/FaviconWithFallback";
import { RichTextDisplay } from "@/components/RichTextEditor";
import { invalidateThumbnailCache } from "@/hooks/use-metadata";
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
import type { LinkItem, Category } from "@/types/link";

const statusLabel: Record<LinkItem["status"], string> = {
  backlog: "Backlog",
  in_progress: "Em progresso",
  done: "Concluído",
};

const priorityLabel: Record<LinkItem["priority"], string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

interface LinkCardProps {
  link: LinkItem;
  categories?: Category[];
  onToggleFavorite: (id: string) => void;
  onEdit: (link: LinkItem) => void;
  onDelete: (id: string) => void;
  onDragStart?: (e: React.DragEvent, link: LinkItem) => void;
  onDragOver?: (e: React.DragEvent, linkId: string) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, link: LinkItem) => void;
  isDragging?: boolean;
  isDropZone?: boolean;
  dragDirection?: "above" | "below";
  isSelected?: boolean;
  onToggleSelect?: (id: string, shiftKey?: boolean) => void;
  linkStatus?: "unknown" | "checking" | "ok" | "broken" | "error";
}

// Função helper para gerar uma cor de fallback
const getAvatarColor = (url: string) => {
  try {
    const hostname = new URL(url).hostname;
    const colors = ['bg-rose-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-orange-500'];
    let hash = 0;
    for (let i = 0; i < hostname.length; i++) hash = hostname.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  } catch {
    return 'bg-slate-500';
  }
};

export function LinkCard({
  link,
  categories,
  onToggleFavorite,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDragEnd,
  onDrop,
  isDragging,
  isDropZone,
  dragDirection,
  isSelected,
  onToggleSelect,
  linkStatus,
}: LinkCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const dragEnabled = Boolean(onDragStart);

  return (
    <Card
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
      className={`group relative overflow-hidden border-2
        transition-all duration-200
        ${isDragging
          ? "z-30 scale-105 -translate-y-2 shadow-2xl shadow-primary/30 opacity-100 border-primary/60 bg-primary/10"
          : ""
        }
        ${!isDragging && dragEnabled ? "snap-animate" : ""}
        ${isDropZone && !isDragging
          ? "border-primary/50 bg-primary/10 shadow-lg shadow-primary/10 scale-[1.02] ring-1 ring-primary/30"
          : !isDragging ? "border-transparent" : ""
        }
        ${isSelected ? "ring-2 ring-primary border-primary" : ""}
        ${dragEnabled ? "cursor-grab active:cursor-grabbing" : ""}
      `}
    >
      {/* Selection checkbox */}
      {onToggleSelect && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect(link.id, e.shiftKey); }}
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
      {/* Drop zone indicator above - inside Card, absolutely positioned */}
      {isDropZone && !isDragging && dragDirection === "above" && (
        <div className="absolute top-0 left-2 right-2 h-[3px] bg-primary rounded-full animate-pulse shadow-[0_0_8px_hsl(var(--primary)/0.6)] z-10" />
      )}
      {/* Drop zone indicator below - inside Card, absolutely positioned */}
      {isDropZone && !isDragging && dragDirection === "below" && (
        <div className="absolute bottom-0 left-2 right-2 h-[3px] bg-primary rounded-full animate-pulse shadow-[0_0_8px_hsl(var(--primary)/0.6)] z-10" />
      )}

      {/* OG Image Cover */}
      {link.ogImage && !imageFailed ? (
        <div className="w-full h-24 overflow-hidden bg-muted relative">
          <img
            src={link.ogImage}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
            onError={() => {
              setImageFailed(true);
              invalidateThumbnailCache(link.url);
            }}
          />
        </div>
      ) : link.ogImage && imageFailed ? (
        <div className={`w-full h-24 flex items-center justify-center opacity-80 ${getAvatarColor(link.url)}`}>
          <LinkIcon className="h-8 w-8 text-white/50" />
        </div>
      ) : null}

      <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* ✅ Ícone de grip para indicar que é draggable */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </div>
          
          <FaviconWithFallback
            url={link.url}
            favicon={link.favicon}
            size={24}
            className="mt-1"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 font-semibold text-foreground hover:text-primary transition-colors truncate"
              >
                {linkStatus === "broken" && (
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-destructive">
                    <title>Link quebrado</title>
                  </ShieldAlert>
                )}
                {link.title || link.url}
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-50" />
              </a>
              <Button
                variant="ghost"
                size="icon"
                className={`${ICON_BTN_MD_CLASS} shrink-0`}
                onClick={() => onToggleFavorite(link.id)}
              >
                <Star
                  className={`h-4 w-4 ${link.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                />
              </Button>
            </div>

            {link.description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {link.description}
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {link.category && (
                <Badge
                  variant="secondary"
                  className={COMPACT_BADGE_CLASS}
                  style={(() => {
                    // ✅ Find color from category hierarchy
                    if (!categories) return {};
                    const cat = categories.find((c) => {
                      const parts: string[] = [c.name];
                      let cur = c;
                      while (cur.parentId) {
                        const p = categories.find((x) => x.id === cur.parentId);
                        if (!p) break;
                        parts.unshift(p.name);
                        cur = p;
                      }
                      return parts.join(" / ") === link.category;
                    });
                    const color = cat?.color;
                    if (!color) return {};
                    return {
                      backgroundColor: `${color}20`,
                      color: color,
                      borderColor: `${color}40`,
                    };
                  })()}
                >
                  {link.category}
                </Badge>
              )}
              {link.tags.map((tag) => (
                <Badge key={tag} variant="outline" className={COMPACT_BADGE_CLASS}>
                  {tag}
                </Badge>
              ))}
              <Badge
                variant={link.status === "done" ? "default" : link.status === "in_progress" ? "secondary" : "outline"}
                className={COMPACT_BADGE_CLASS}
              >
                {statusLabel[link.status]}
              </Badge>
              <Badge
                variant={link.priority === "high" ? "destructive" : link.priority === "medium" ? "secondary" : "outline"}
                className={COMPACT_BADGE_CLASS}
              >
                {priorityLabel[link.priority]}
              </Badge>
              {link.dueDate && (
                <Badge variant="outline" className={COMPACT_BADGE_CLASS}>
                  {new Date(link.dueDate).toLocaleDateString("pt-BR")}
                </Badge>
              )}
              {link.notes && (
                <span className={`inline-flex items-center gap-0.5 ${TEXT_XS_CLASS} text-muted-foreground`} title="Tem notas">
                  <StickyNote className="h-3 w-3" />
                </span>
              )}
            </div>

            {link.notes && (
              <div className={`mt-2 rounded-md bg-muted/50 px-2.5 py-1.5 ${TEXT_XS_CLASS} leading-relaxed line-clamp-3`}>
                <RichTextDisplay content={link.notes} className={TEXT_XS_CLASS} />
              </div>
            )}
          </div>

          <div className="absolute right-2 bottom-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
                    Esta acao nao pode ser desfeita. O link sera removido permanentemente.
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
        </CardContent>
    </Card>
  );
}
