import { useState } from "react";
import { Trash2, Star, FolderInput, Tag, X, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Category } from "@/types/link";

interface BatchActionBarProps {
  selectedCount: number;
  categories: Category[];
  onClearSelection: () => void;
  onBatchDelete: () => void;
  onBatchFavorite: () => void;
  onBatchUnfavorite: () => void;
  onBatchMove: (categoryFullName: string) => void;
  onBatchTag: (tag: string) => void;
  onSelectAll: () => void;
}

function buildFullName(cat: Category, categories: Category[]): string {
  const parts: string[] = [cat.name];
  let current = cat;
  while (current.parentId) {
    const parent = categories.find((c) => c.id === current.parentId);
    if (!parent) break;
    parts.unshift(parent.name);
    current = parent;
  }
  return parts.join(" / ");
}

export function BatchActionBar({
  selectedCount,
  categories,
  onClearSelection,
  onBatchDelete,
  onBatchFavorite,
  onBatchUnfavorite,
  onBatchMove,
  onBatchTag,
  onSelectAll,
}: BatchActionBarProps) {
  const [tagInput, setTagInput] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (selectedCount === 0) return null;

  // Build flat category list for move popover
  const buildCategoryOptions = () => {
    const options: { fullName: string; label: string; depth: number }[] = [];
    const addChildren = (parentId: string | null, depth: number) => {
      const children = categories
        .filter((c) => (parentId ? c.parentId === parentId : !c.parentId))
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      for (const child of children) {
        options.push({
          fullName: buildFullName(child, categories),
          label: "\u00A0\u00A0".repeat(depth) + child.name,
          depth,
        });
        addChildren(child.id, depth + 1);
      }
    };
    addChildren(null, 0);
    return options;
  };

  const categoryOptions = buildCategoryOptions();

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border bg-background/95 backdrop-blur-md shadow-xl px-4 py-2.5 animate-in slide-in-from-bottom-4">
        {/* Count */}
        <Badge variant="default" className="font-semibold">
          {selectedCount} selecionado(s)
        </Badge>

        <div className="h-5 w-px bg-border mx-1" />

        {/* Select All */}
        <Button variant="ghost" size="sm" onClick={onSelectAll} title="Selecionar todos">
          <CheckSquare className="h-4 w-4 mr-1" />
          Todos
        </Button>

        {/* Favorite */}
        <Button variant="ghost" size="sm" onClick={onBatchFavorite} title="Favoritar selecionados">
          <Star className="h-4 w-4 mr-1 fill-yellow-400 text-yellow-400" />
          Favoritar
        </Button>

        {/* Unfavorite */}
        <Button variant="ghost" size="sm" onClick={onBatchUnfavorite} title="Desfavoritar selecionados">
          <Star className="h-4 w-4 mr-1" />
          Desfavoritar
        </Button>

        {/* Move to category */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" title="Mover para categoria">
              <FolderInput className="h-4 w-4 mr-1" />
              Mover
            </Button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-56 p-1 max-h-64 overflow-y-auto">
            <button
              onClick={() => onBatchMove("")}
              className="flex items-center w-full px-3 py-2 rounded-md text-sm hover:bg-muted text-muted-foreground"
            >
              Sem categoria
            </button>
            {categoryOptions.map((opt) => (
              <button
                key={opt.fullName}
                onClick={() => onBatchMove(opt.fullName)}
                className="flex items-center w-full px-3 py-2 rounded-md text-sm hover:bg-muted text-left"
              >
                {opt.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {/* Add tag */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" title="Adicionar tag">
              <Tag className="h-4 w-4 mr-1" />
              Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-56 p-3">
            <div className="flex gap-2">
              <Input
                placeholder="Nome da tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && tagInput.trim()) {
                    onBatchTag(tagInput.trim().toLowerCase());
                    setTagInput("");
                  }
                }}
                className="h-8 text-sm"
              />
              <Button
                size="sm"
                className="h-8"
                onClick={() => {
                  if (tagInput.trim()) {
                    onBatchTag(tagInput.trim().toLowerCase());
                    setTagInput("");
                  }
                }}
              >
                +
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Delete */}
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => setShowDeleteConfirm(true)}
          title="Excluir selecionados"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Excluir
        </Button>

        <div className="h-5 w-px bg-border mx-1" />

        {/* Close */}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClearSelection}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedCount} link(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Os links selecionados serão movidos para a lixeira.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onBatchDelete();
                setShowDeleteConfirm(false);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
