import { useMemo, useState } from "react";
import { Star, ExternalLink, Pencil, Trash2, StickyNote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { COMPACT_BADGE_CLASS, ICON_BTN_SM_CLASS, TEXT_XS_CLASS } from "@/lib/utils";
import type { LinkItem } from "@/types/link";

interface LinkBoardViewProps {
  links: LinkItem[];
  onToggleFavorite: (id: string) => void;
  onUpdateLink: (id: string, data: Partial<Omit<LinkItem, "id" | "createdAt" | "position">>) => void;
  onEdit: (link: LinkItem) => void;
  onDelete: (id: string) => void;
  onMoveToStatus: (id: string, status: LinkItem["status"]) => void;
  onReorderWithinStatus: (draggedId: string, targetId: string) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string, shiftKey?: boolean) => void;
}

type BoardColumnFilter = "all" | "favorites" | "high" | "urgent";

const statusMeta: Record<LinkItem["status"], { label: string; badgeVariant: "outline" | "secondary" | "default" }> = {
  backlog: { label: "Backlog", badgeVariant: "outline" },
  in_progress: { label: "Em progresso", badgeVariant: "secondary" },
  done: { label: "Concluído", badgeVariant: "default" },
};

export function LinkBoardView({ links, onToggleFavorite, onUpdateLink, onEdit, onDelete, onMoveToStatus, onReorderWithinStatus, selectedIds, onToggleSelect }: LinkBoardViewProps) {
  const [draggedLinkId, setDraggedLinkId] = useState<string | null>(null);
  const [dropStatus, setDropStatus] = useState<LinkItem["status"] | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<LinkItem["status"], BoardColumnFilter>>({
    backlog: "all",
    in_progress: "all",
    done: "all",
  });

  const dueState = (dueDate?: string | null): "none" | "overdue" | "today" | "upcoming" => {
    if (!dueDate) return "none";
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) return "none";

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (due < todayStart) return "overdue";
    if (due >= todayStart && due < tomorrow) return "today";
    return "upcoming";
  };

  const applyColumnFilter = (items: LinkItem[], filter: BoardColumnFilter) => {
    if (filter === "favorites") return items.filter((link) => link.isFavorite);
    if (filter === "high") return items.filter((link) => link.priority === "high");
    if (filter === "urgent") {
      return items.filter((link) => {
        const state = dueState(link.dueDate);
        return state === "overdue" || state === "today";
      });
    }
    return items;
  };

  const startInlineTitleEdit = (link: LinkItem) => {
    setEditingTitleId(link.id);
    setEditingTitle(link.title || "");
  };

  const commitInlineTitleEdit = (linkId: string) => {
    onUpdateLink(linkId, { title: editingTitle.trim() });
    setEditingTitleId(null);
    setEditingTitle("");
  };

  const cancelInlineTitleEdit = () => {
    setEditingTitleId(null);
    setEditingTitle("");
  };

  // Agrupar links por status
  const columns = useMemo(() => {
    return (["backlog", "in_progress", "done"] as LinkItem["status"][]).map((statusKey) => ({
      key: statusKey,
      name: statusMeta[statusKey].label,
      badgeVariant: statusMeta[statusKey].badgeVariant,
      links: applyColumnFilter(
        links
        .filter((link) => link.status === statusKey)
        .sort((a, b) => (a.positionInStatus ?? a.position ?? 0) - (b.positionInStatus ?? b.position ?? 0)),
        columnFilters[statusKey]
      ),
      total: links.filter((link) => link.status === statusKey).length,
      filter: columnFilters[statusKey],
    }));
  }, [links, columnFilters]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-3 px-3 md:-mx-6 md:px-6 snap-x">
      {columns.map((column) => {
        const allLinks = column.links;
        return (
        <div
          key={column.key}
          className={`flex-shrink-0 w-72 snap-start rounded-lg transition-colors ${
            dropStatus === column.key ? "bg-primary/5" : ""
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDropStatus(column.key);
          }}
          onDragLeave={(e) => {
            const related = e.relatedTarget as Node | null;
            if (!related || !e.currentTarget.contains(related)) {
              setDropStatus((prev) => (prev === column.key ? null : prev));
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            const droppedId = e.dataTransfer.getData("text/plain") || draggedLinkId;
            if (!droppedId) {
              setDropStatus(null);
              return;
            }
            const droppedLink = links.find((link) => link.id === droppedId);
            if (droppedLink && droppedLink.status !== column.key) {
              onMoveToStatus(droppedId, column.key);
            }
            setDraggedLinkId(null);
            setDropStatus(null);
          }}
        >
          {/* Column header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <Badge variant={column.badgeVariant} className={`${COMPACT_BADGE_CLASS} shrink-0`}>
              {column.name}
            </Badge>
            <Badge variant="secondary" className={`${COMPACT_BADGE_CLASS} ml-2 shrink-0`}>
              {allLinks.length}/{column.total}
            </Badge>
          </div>

          <div className="mb-2 flex flex-wrap gap-1 px-1">
            {[
              { id: "all", label: "Todos" },
              { id: "favorites", label: "Fav" },
              { id: "high", label: "Alta" },
              { id: "urgent", label: "Urg" },
            ].map((filter) => (
              <Button
                key={filter.id}
                type="button"
                variant={column.filter === filter.id ? "default" : "outline"}
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => setColumnFilters((prev) => ({ ...prev, [column.key]: filter.id as BoardColumnFilter }))}
              >
                {filter.label}
              </Button>
            ))}
          </div>

          {/* Column cards */}
          <div className="flex flex-col gap-2">
            {column.links.map((link) => (
              <Card
                key={link.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", link.id);
                  setDraggedLinkId(link.id);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDropStatus(column.key);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const droppedId = e.dataTransfer.getData("text/plain") || draggedLinkId;
                  if (!droppedId || droppedId === link.id) {
                    setDraggedLinkId(null);
                    setDropStatus(null);
                    return;
                  }

                  const droppedLink = links.find((item) => item.id === droppedId);
                  if (!droppedLink) {
                    setDraggedLinkId(null);
                    setDropStatus(null);
                    return;
                  }

                  if (droppedLink.status === link.status) {
                    onReorderWithinStatus(droppedId, link.id);
                  } else {
                    onMoveToStatus(droppedId, link.status);
                  }

                  setDraggedLinkId(null);
                  setDropStatus(null);
                }}
                onDragEnd={() => {
                  setDraggedLinkId(null);
                  setDropStatus(null);
                }}
                className={`group relative overflow-hidden border hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing ${
                selectedIds?.has(link.id) ? "ring-2 ring-primary border-primary" : ""
              }`}
              >
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
                  {/* Selection checkbox */}
                  {onToggleSelect && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleSelect(link.id, e.shiftKey); }}
                      className={`absolute top-2 left-2 z-20 h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
                        selectedIds?.has(link.id)
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-background/80 border-muted-foreground/40 opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      {selectedIds?.has(link.id) && (
                        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  )}
                  <div className="flex items-start gap-2">
                    <FaviconWithFallback url={link.url} favicon={link.favicon} size={18} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      {editingTitleId === link.id ? (
                        <Input
                          autoFocus
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={() => commitInlineTitleEdit(link.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitInlineTitleEdit(link.id);
                            }
                            if (e.key === "Escape") {
                              e.preventDefault();
                              cancelInlineTitleEdit();
                            }
                          }}
                          className="h-8 text-xs"
                        />
                      ) : (
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors line-clamp-2"
                          onDoubleClick={(e) => {
                            e.preventDefault();
                            startInlineTitleEdit(link);
                          }}
                          title="Duplo clique para editar titulo"
                        >
                          {link.title || link.url}
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-40" />
                        </a>
                      )}

                      {link.description && (
                        <p className={`mt-1 ${TEXT_XS_CLASS} text-muted-foreground line-clamp-2`}>
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

                      <div className="mt-1.5 flex items-center gap-1">
                        <Select
                          value={link.status}
                          onValueChange={(value: LinkItem["status"]) => onMoveToStatus(link.id, value)}
                        >
                          <SelectTrigger className="h-6 min-w-[122px] px-2 text-[11px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="backlog">Backlog</SelectItem>
                            <SelectItem value="in_progress">Em progresso</SelectItem>
                            <SelectItem value="done">Concluido</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select
                          value={link.priority}
                          onValueChange={(value: LinkItem["priority"]) => onUpdateLink(link.id, { priority: value })}
                        >
                          <SelectTrigger className="h-6 min-w-[104px] px-2 text-[11px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Baixa</SelectItem>
                            <SelectItem value="medium">Media</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                          </SelectContent>
                        </Select>
                        {link.dueDate && (
                          <Badge
                            variant={
                              dueState(link.dueDate) === "overdue"
                                ? "destructive"
                                : dueState(link.dueDate) === "today"
                                  ? "secondary"
                                  : "outline"
                            }
                            className={COMPACT_BADGE_CLASS}
                          >
                            {new Date(link.dueDate).toLocaleDateString("pt-BR")}
                          </Badge>
                        )}
                      </div>

                      {link.notes && (
                        <span className={`inline-flex items-center gap-0.5 ${TEXT_XS_CLASS} text-muted-foreground mt-1`} title={link.notes}>
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
                      className={ICON_BTN_SM_CLASS}
                      onClick={() => onToggleFavorite(link.id)}
                    >
                      <Star
                        className={`h-3 w-3 ${link.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                      />
                    </Button>
                    <Button variant="ghost" size="icon" className={ICON_BTN_SM_CLASS} onClick={() => onEdit(link)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className={`${ICON_BTN_SM_CLASS} text-destructive`}>
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

            {allLinks.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 p-6 text-center">
                <p className={`${TEXT_XS_CLASS} text-muted-foreground`}>Nenhum link</p>
              </div>
            )}
          </div>
        </div>
        );
      })}
    </div>
  );
}
