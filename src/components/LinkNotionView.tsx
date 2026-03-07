import { useEffect, useRef, useState } from "react";
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

const THUMB_MIN_WIDTH = 112;
const THUMB_MAX_WIDTH = 220;
const THUMB_DEFAULT_WIDTH = 140;
const THUMB_STORAGE_KEY = "notion-thumb-width";
const DENSITY_STORAGE_KEY = "notion-list-density";

type ListDensity = "compact" | "normal" | "comfortable";

const DENSITY_OPTIONS: Array<{ value: ListDensity; label: string }> = [
  { value: "compact", label: "Compacto" },
  { value: "normal", label: "Normal" },
  { value: "comfortable", label: "Conforto" },
];

const DENSITY_STYLES: Record<ListDensity, {
  rowMinHeight: string;
  contentPadding: string;
  textRightPadding: string;
  titleClass: string;
  descriptionClass: string;
  domainClass: string;
  thumbPadding: string;
  actionsWrapClass: string;
  actionsLayoutClass: string;
  actionsButtonClass: string;
  actionsIconClass: string;
}> = {
  compact: {
    rowMinHeight: "min-h-[108px]",
    contentPadding: "p-2.5 md:p-3",
    textRightPadding: "pr-2",
    titleClass: "text-[15px]",
    descriptionClass: "mt-0.5 text-xs",
    domainClass: "mt-2 text-xs",
    thumbPadding: "p-1.5 pt-2",
    actionsWrapClass: "gap-0.5",
    actionsLayoutClass: "flex-row",
    actionsButtonClass: "h-7 w-7",
    actionsIconClass: "h-3 w-3",
  },
  normal: {
    rowMinHeight: "min-h-[126px]",
    contentPadding: "p-3 md:p-3.5",
    textRightPadding: "pr-2",
    titleClass: "text-base",
    descriptionClass: "mt-1 text-sm",
    domainClass: "mt-3 text-sm",
    thumbPadding: "p-2 pt-3",
    actionsWrapClass: "gap-0.5",
    actionsLayoutClass: "flex-col",
    actionsButtonClass: "h-7 w-7",
    actionsIconClass: "h-3.5 w-3.5",
  },
  comfortable: {
    rowMinHeight: "min-h-[144px]",
    contentPadding: "p-4 md:p-4",
    textRightPadding: "pr-2",
    titleClass: "text-base md:text-[17px]",
    descriptionClass: "mt-1.5 text-sm",
    domainClass: "mt-3.5 text-sm",
    thumbPadding: "p-2.5 pt-3.5",
    actionsWrapClass: "gap-1",
    actionsLayoutClass: "flex-col",
    actionsButtonClass: "h-8 w-8",
    actionsIconClass: "h-4 w-4",
  },
};

const ACTIONS_COLUMN_WIDTH_BY_DENSITY: Record<ListDensity, number> = {
  compact: 72,
  normal: 88,
  comfortable: 96,
};

function clampThumbWidth(value: number): number {
  return Math.min(THUMB_MAX_WIDTH, Math.max(THUMB_MIN_WIDTH, value));
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
  const [thumbWidth, setThumbWidth] = useState<number>(() => {
    if (typeof window === "undefined") return THUMB_DEFAULT_WIDTH;
    const saved = Number(window.localStorage.getItem(THUMB_STORAGE_KEY));
    return Number.isFinite(saved) ? clampThumbWidth(saved) : THUMB_DEFAULT_WIDTH;
  });
  const [isResizingThumb, setIsResizingThumb] = useState(false);
  const [density, setDensity] = useState<ListDensity>(() => {
    if (typeof window === "undefined") return "normal";
    const saved = window.localStorage.getItem(DENSITY_STORAGE_KEY);
    return saved === "compact" || saved === "normal" || saved === "comfortable" ? saved : "normal";
  });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragEnabled = Boolean(onDragStart) && !isResizingThumb;
  const densityStyle = DENSITY_STYLES[density];
  const actionsColumnWidth = ACTIONS_COLUMN_WIDTH_BY_DENSITY[density];

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(THUMB_STORAGE_KEY, String(thumbWidth));
  }, [thumbWidth]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DENSITY_STORAGE_KEY, density);
  }, [density]);

  useEffect(() => {
    if (!isResizingThumb) return;

    const onPointerMove = (event: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const nextWidth = clampThumbWidth(Math.round(rect.right - event.clientX));
      setThumbWidth(nextWidth);
    };

    const onPointerUp = () => {
      setIsResizingThumb(false);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [isResizingThumb]);

  useEffect(() => {
    if (!isResizingThumb || typeof document === "undefined") return;

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [isResizingThumb]);

  const startResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsResizingThumb(true);
  };

  const resetResize = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setThumbWidth(THUMB_DEFAULT_WIDTH);
  };

  const thumbFrameWidth = Math.max(96, thumbWidth - 16);
  const thumbFrameHeight = Math.max(62, Math.round(thumbFrameWidth * 0.63));

  return (
    <div ref={containerRef} className="overflow-hidden rounded-lg border border-border/60 bg-background">
      <div className="sticky top-0 z-20 flex items-center border-b border-border/60 bg-background/95 px-3 py-2 backdrop-blur-sm md:px-3.5">
        <div className="min-w-0 flex-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Conteudo
        </div>
        <div className="mr-2 flex items-center gap-1">
          {DENSITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDensity(option.value)}
              className={`rounded px-1.5 py-1 text-[10px] font-medium transition-colors ${
                density === option.value
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div
          className="flex items-center justify-center border-l border-border/60 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          style={{ width: `${actionsColumnWidth}px` }}
        >
          Acoes
        </div>
        <div
          className="flex items-center justify-center border-l border-border/60 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          style={{ width: `${thumbWidth}px` }}
        >
          Preview
        </div>
      </div>

      {links.map((link, index) => {
        const isDragging = draggedLinkId === link.id;
        const isDropZone = dropZoneId === link.id && draggedLinkId !== null && !isDragging;
        const isSelected = selectedIds?.has(link.id);
        const domain = safeDomain(link.url);
        const health = linkStatusById?.[link.id];
        const isFirstRow = index === 0;

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
            className={`group relative flex items-stretch overflow-hidden border-b border-border/60 bg-background transition-colors duration-150 last:border-b-0 ${densityStyle.rowMinHeight} ${
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

            <div className={`relative min-w-0 flex-1 ${densityStyle.contentPadding}`}>
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

                <div className={`min-w-0 flex-1 ${densityStyle.textRightPadding}`}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex max-w-full items-center gap-1.5 font-semibold text-foreground transition-colors hover:text-primary ${densityStyle.titleClass}`}
                  >
                    {health === "broken" && <ShieldAlert className="h-4 w-4 shrink-0 text-destructive" />}
                    <span className="truncate">{link.title || domain}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 opacity-45" />
                  </a>

                  {link.description && (
                    <p className={`line-clamp-2 text-muted-foreground/90 ${densityStyle.descriptionClass}`}>
                      {link.description}
                    </p>
                  )}

                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex max-w-full items-center gap-1.5 font-medium text-foreground/90 hover:text-primary ${densityStyle.domainClass}`}
                  >
                    <FaviconWithFallback url={link.url} favicon={link.favicon} size={14} />
                    <span className="truncate">{domain}</span>
                  </a>

                  <div className="mt-2 hidden items-center gap-2 text-xs text-muted-foreground transition-opacity md:flex md:opacity-0 md:group-hover:opacity-100">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded px-1.5 py-1 hover:bg-muted hover:text-foreground"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Abrir
                    </a>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(link);
                      }}
                      className="inline-flex items-center gap-1 rounded px-1.5 py-1 hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="h-3 w-3" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(link.id);
                      }}
                      className="inline-flex items-center gap-1 rounded px-1.5 py-1 hover:bg-muted hover:text-foreground"
                    >
                      <Star className={`h-3 w-3 ${link.isFavorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
                      {link.isFavorite ? "Favorito" : "Favoritar"}
                    </button>
                  </div>
                </div>
              </div>

            </div>

            <div
              className="relative flex shrink-0 items-start justify-center border-l border-border/60 bg-background/70 p-2 pt-3"
              style={{ width: `${actionsColumnWidth}px` }}
            >
              <div className="flex flex-col items-center gap-1 opacity-100 transition-opacity md:opacity-65 md:group-hover:opacity-100">
                <div className={`flex items-center ${densityStyle.actionsLayoutClass} ${densityStyle.actionsWrapClass}`}>
                <Button
                  variant="ghost"
                  size="icon"
                  title={link.isFavorite ? "Remover favorito" : "Favoritar"}
                  className={`${ICON_BTN_MD_CLASS} ${densityStyle.actionsButtonClass}`}
                  onClick={() => onToggleFavorite(link.id)}
                >
                  <Star className={`${densityStyle.actionsIconClass} ${link.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Editar"
                  className={`${ICON_BTN_MD_CLASS} ${densityStyle.actionsButtonClass}`}
                  onClick={() => onEdit(link)}
                >
                  <Pencil className={densityStyle.actionsIconClass} />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" title="Excluir" className={`${ICON_BTN_MD_CLASS} ${densityStyle.actionsButtonClass} text-destructive`}>
                      <Trash2 className={densityStyle.actionsIconClass} />
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
            </div>

            <div
              className={`relative flex shrink-0 items-start justify-center border-l border-border/60 bg-muted/5 ${densityStyle.thumbPadding}`}
              style={{ width: `${thumbWidth}px` }}
            >
              <button
                type="button"
                aria-label="Redimensionar thumbnail"
                onPointerDown={startResize}
                onDoubleClick={resetResize}
                title="Arraste para redimensionar (duplo clique para resetar)"
                className="absolute -left-2 top-0 h-full w-4 cursor-col-resize bg-transparent touch-none"
                style={{ touchAction: "none" }}
              >
                <span className={`absolute left-1/2 top-1/2 h-12 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors ${isResizingThumb ? "bg-primary" : "bg-border group-hover:bg-foreground/50"}`} />
                <span className={`pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded bg-background/95 px-1.5 py-0.5 text-[10px] text-muted-foreground shadow-sm transition-opacity ${
                  isResizingThumb || isFirstRow ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}>
                  Arraste
                </span>
              </button>
              <div
                className="overflow-hidden rounded-md border border-border/35 bg-muted/10"
                style={{ width: `${thumbFrameWidth}px`, height: `${thumbFrameHeight}px` }}
              >
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
