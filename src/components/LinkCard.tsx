import { Star, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LinkItem } from "@/types/link";

interface LinkCardProps {
  link: LinkItem;
  onToggleFavorite: (id: string) => void;
  onEdit: (link: LinkItem) => void;
  onDelete: (id: string) => void;
}

export function LinkCard({ link, onToggleFavorite, onEdit, onDelete }: LinkCardProps) {
  const faviconUrl = link.favicon || `https://www.google.com/s2/favicons?domain=${new URL(link.url).hostname}&sz=32`;

  return (
    <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
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
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(link.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
