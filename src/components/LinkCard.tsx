import { Star, ExternalLink, Pencil, Trash2, GripVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

interface LinkCardProps {
  link: LinkItem;
  onToggleFavorite: (id: string) => void;
  onEdit: (link: LinkItem) => void;
  onDelete: (id: string) => void;
  onDragStart?: (e: React.DragEvent, link: LinkItem) => void; // ✅ Para drag & drop
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, link: LinkItem) => void;
  isDragging?: boolean;
}

export function LinkCard({ link, onToggleFavorite, onEdit, onDelete, onDragStart, onDragOver, onDrop, isDragging }: LinkCardProps) {
  const dragEnabled = Boolean(onDragStart);
  // ✅ Usar serviço mais privado para favicons (icon.horse)
  const getFaviconUrl = () => {
    if (link.favicon && link.favicon.startsWith('http')) {
      return link.favicon;
    }
    try {
      const hostname = new URL(link.url).hostname;
      if (!hostname) return '/placeholder.svg';
      // Usar icon.horse (mais privado que Google)
      return `https://icon.horse/icon/${hostname}?size=32`;
    } catch {
      return '/placeholder.svg';
    }
  };
  
  const faviconUrl = getFaviconUrl();

  return (
    <Card 
      draggable={dragEnabled}
      onDragStart={(e) => onDragStart?.(e, link)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver?.(e);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop?.(e, link);
      }}
      className={`group relative overflow-hidden transition-all ${
        isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md'
      } ${dragEnabled ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* ✅ Ícone de grip para indicar que é draggable */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          </div>
          
          <img
            src={faviconUrl}
            alt=""
            className="mt-1 h-6 w-6 shrink-0 rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.svg";
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 font-semibold text-foreground hover:text-primary transition-colors truncate"
              >
                {link.title || link.url}
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-50" />
              </a>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
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
                <Badge variant="secondary" className="text-xs">
                  {link.category}
                </Badge>
              )}
              {link.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute right-2 bottom-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(link)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
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
      </CardContent>
    </Card>
  );
}
