import { useEffect, useRef, useState } from "react";
import { ExternalLink, GripVertical, MoreHorizontal, Pencil, ShieldAlert, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FaviconWithFallback } from "@/components/FaviconWithFallback";
import { ensureProxied } from "@/lib/image-utils";
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
const THUMB_SNAP_WIDTHS = [112, 160, 220] as const;
type ThumbSnapWidth = (typeof THUMB_SNAP_WIDTHS)[number];
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
  descriptionSlotClass: string;
  domainClass: string;
  thumbPadding: string;
  gutterTopClass: string;
  gutterGapClass: string;
}> = {
  compact: {
    rowMinHeight: "min-h-[108px]",
    contentPadding: "p-2.5 md:p-3",
    textRightPadding: "pr-20 md:pr-24",
    titleClass: "text-[15px]",
    descriptionClass: "mt-0.5 text-xs",
    descriptionSlotClass: "min-h-8",
    domainClass: "mt-3 text-xs",
    thumbPadding: "p-1.5",
    gutterTopClass: "pt-2.5",
    gutterGapClass: "gap-[5px]",
  },
  normal: {
    rowMinHeight: "min-h-[126px]",
    contentPadding: "p-3 md:p-3.5",
    textRightPadding: "pr-20 md:pr-24",
    titleClass: "text-base",
    descriptionClass: "mt-1 text-sm",
    descriptionSlotClass: "min-h-10",
    domainClass: "mt-4 text-sm",
    thumbPadding: "p-2",
    gutterTopClass: "pt-3",
    gutterGapClass: "gap-1.5",
  },
  comfortable: {
    rowMinHeight: "min-h-[144px]",
    contentPadding: "p-4 md:p-4",
    textRightPadding: "pr-20 md:pr-24",
    titleClass: "text-base md:text-[17px]",
    descriptionClass: "mt-1.5 text-sm",
    descriptionSlotClass: "min-h-11",
    domainClass: "mt-5 text-sm",
    thumbPadding: "p-2.5",
    gutterTopClass: "pt-3.5",
    gutterGapClass: "gap-1.5",
  },
};

function clampThumbWidth(value: number): number {
  return Math.min(THUMB_MAX_WIDTH, Math.max(THUMB_MIN_WIDTH, value));
}

function nearestSnapWidth(value: number): ThumbSnapWidth {
  return THUMB_SNAP_WIDTHS.reduce((closest, candidate) => {
    return Math.abs(candidate - value) < Math.abs(closest - value) ? candidate : closest;
  }, THUMB_SNAP_WIDTHS[0]);
}

function nextSnapWidth(value: number): ThumbSnapWidth {
  const current = nearestSnapWidth(value);
  const idx = THUMB_SNAP_WIDTHS.indexOf(current);
  return THUMB_SNAP_WIDTHS[(idx + 1) % THUMB_SNAP_WIDTHS.length];
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
  const [openMobileMenuId, setOpenMobileMenuId] = useState<string | null>(null);
  const [density, setDensity] = useState<ListDensity>(() => {
    if (typeof window === "undefined") return "normal";
    const saved = window.localStorage.getItem(DENSITY_STORAGE_KEY);
    return saved === "compact" || saved === "normal" || saved === "comfortable" ? saved : "normal";
  });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragEnabled = Boolean(onDragStart) && !isResizingThumb;
  const densityStyle = DENSITY_STYLES[density];

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
      let nextWidth = clampThumbWidth(Math.round(rect.right - event.clientX));
      if (event.shiftKey) {
        nextWidth = nearestSnapWidth(nextWidth);
      }
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

  useEffect(() => {
    if (!openMobileMenuId) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const clickedTrigger = target.closest("[data-mobile-actions-trigger='true']");
      const clickedMenu = target.closest("[data-mobile-actions-menu='true']");
      if (!clickedTrigger && !clickedMenu) {
        setOpenMobileMenuId(null);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openMobileMenuId]);

  const startResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsResizingThumb(true);
  };

  const resetResize = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setThumbWidth(nextSnapWidth(thumbWidth));
  };

  const thumbFrameWidth = Math.max(96, thumbWidth - 16);
  const thumbFrameHeight = Math.max(56, Math.round((thumbFrameWidth * 9) / 16));

  return (
    <div ref={containerRef} className="mx-3 flex flex-col gap-3 md:mx-6 lg:mx-8">
      <div className="sticky top-0 z-20 flex items-center border-b border-border/70 bg-background/95 px-3 py-2 backdrop-blur-sm md:px-3.5">
        <div className="min-w-0 flex-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/75">
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
        <div className="mr-2 flex items-center gap-1 border-l border-border/50 pl-2">
          <button
            type="button"
            onClick={() => setThumbWidth(THUMB_SNAP_WIDTHS[0])}
            className={`rounded px-1.5 py-1 text-[10px] font-medium transition-colors ${thumbWidth === THUMB_SNAP_WIDTHS[0] ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`}
            title="Thumbnail pequena"
          >
            S
          </button>
          <button
            type="button"
            onClick={() => setThumbWidth(THUMB_SNAP_WIDTHS[1])}
            className={`rounded px-1.5 py-1 text-[10px] font-medium transition-colors ${thumbWidth === THUMB_SNAP_WIDTHS[1] ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`}
            title="Thumbnail média"
          >
            M
          </button>
          <button
            type="button"
            onClick={() => setThumbWidth(THUMB_SNAP_WIDTHS[2])}
            className={`rounded px-1.5 py-1 text-[10px] font-medium transition-colors ${thumbWidth === THUMB_SNAP_WIDTHS[2] ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`}
            title="Thumbnail grande"
          >
            L
          </button>
        </div>
        <div
          className="flex items-center justify-center border-l border-border/70 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/75"
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
        const hasDescription = Boolean(link.description?.trim());

        return (
          <div key={link.id} className="group flex items-stretch gap-2">
            <div className={`w-8 shrink-0 ${densityStyle.gutterTopClass}`}>
              <div className={`flex items-start justify-center ${densityStyle.gutterGapClass}`}>
                <div className="pt-0.5 text-muted-foreground/70 opacity-80 transition-opacity group-hover:opacity-100">
                  <GripVertical className="h-3.5 w-3.5" />
                </div>

                {onToggleSelect && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelect(link.id, e.shiftKey);
                    }}
                    className={`h-4 w-4 rounded-sm border transition-all ${
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/40 bg-background opacity-80 group-hover:opacity-100"
                    }`}
                  />
                )}
              </div>
            </div>

          <article
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
            className={`relative flex flex-1 items-stretch overflow-hidden rounded-xl border border-border/40 bg-background transition-[background-color,border-color,min-height] duration-150 ease-out ${densityStyle.rowMinHeight} ${
              dragEnabled ? "cursor-grab active:cursor-grabbing" : ""
            } ${
              isSelected ? "border-primary/60 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.35)]" : ""
            } ${
              isDragging ? "opacity-30" : "hover:border-border/55"
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


            <div className={`relative min-w-0 flex flex-1 items-center transition-[padding] duration-150 ease-out ${densityStyle.contentPadding}`}>
              <div className="flex w-full items-center">
                <div className={`min-w-0 flex-1 ${densityStyle.textRightPadding} flex flex-col justify-center`}>
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

                  <div className={densityStyle.descriptionSlotClass}>
                    {hasDescription && (
                      <p className={`line-clamp-2 text-muted-foreground/90 ${densityStyle.descriptionClass}`}>
                        {link.description}
                      </p>
                    )}
                  </div>

                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex max-w-full items-center gap-1.5 font-medium tracking-[0.01em] text-foreground/70 hover:text-primary ${densityStyle.domainClass}`}
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

              <div className="absolute right-2 top-2 flex items-center gap-0.5 md:right-3 md:top-3">
                <Button
                  variant="ghost"
                  size="icon"
                  title={link.isFavorite ? "Remover favorito" : "Favoritar"}
                  className={`${ICON_BTN_MD_CLASS} h-8 w-8 md:h-7 md:w-7`}
                  onClick={() => onToggleFavorite(link.id)}
                >
                  <Star className={`h-4 w-4 md:h-3.5 md:w-3.5 ${link.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                </Button>

                <div className="relative md:hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    data-mobile-actions-trigger="true"
                    className={`${ICON_BTN_MD_CLASS} h-8 w-8`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMobileMenuId((current) => (current === link.id ? null : link.id));
                    }}
                    title="Mais ações"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>

                  {openMobileMenuId === link.id && (
                    <div
                      data-mobile-actions-menu="true"
                      className="absolute right-0 top-9 z-30 min-w-[132px] rounded-md border border-border/70 bg-background p-1 shadow-lg"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(link);
                          setOpenMobileMenuId(null);
                        }}
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(link.id);
                          setOpenMobileMenuId(null);
                        }}
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-destructive hover:bg-muted"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-0.5 md:pointer-events-none md:translate-x-1 md:opacity-0 md:transition-all md:duration-150 md:group-hover:pointer-events-auto md:group-hover:translate-x-0 md:group-hover:opacity-100">
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

            </div>

            <div
              className={`relative flex shrink-0 items-center justify-center border-l border-border/60 bg-muted/5 transition-[padding,width] duration-150 ease-out ${densityStyle.thumbPadding}`}
              style={{ width: `${thumbWidth}px` }}
            >
              <button
                type="button"
                aria-label="Redimensionar thumbnail"
                onPointerDown={startResize}
                onDoubleClick={resetResize}
                title="Arraste para redimensionar (duplo clique alterna tamanhos)"
                className="absolute -left-2 top-0 h-full w-4 cursor-col-resize bg-transparent touch-none"
                style={{ touchAction: "none" }}
              >
                <span className={`absolute left-1/2 top-1/2 h-12 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors ${isResizingThumb ? "bg-primary" : "bg-border group-hover:bg-foreground/50"}`} />
              </button>
              <div
                className="overflow-hidden rounded-lg border border-border/30 bg-muted/10"
                style={{ width: `${thumbFrameWidth}px`, height: `${thumbFrameHeight}px` }}
              >
                {link.ogImage ? (
                  <img
                    src={ensureProxied(link.ogImage)}
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
          </div>
        );
      })}
    </div>
  );
}
