import { AlertCircle, Loader2, Globe } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { LinkMetadata } from "@/hooks/use-metadata";

interface LinkPreviewProps {
  metadata: LinkMetadata;
  url: string;
}

function getHostname(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname;
  } catch {
    try {
      return new URL(`https://${rawUrl}`).hostname;
    } catch {
      return rawUrl;
    }
  }
}

export function LinkPreview({ metadata, url }: LinkPreviewProps) {
  if (!url) {
    return null;
  }

  if (metadata.loading) {
    return (
      <div className="mt-4 p-4 border rounded-lg bg-muted/50 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Carregando metadados...</p>
      </div>
    );
  }

  if (metadata.error) {
    return (
      <Alert className="mt-4 border-yellow-200 bg-yellow-50">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800 text-sm">
          Não foi possível carregar metadados: {metadata.error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!metadata.title && !metadata.description && !metadata.image) {
    return null;
  }

  return (
    <div className="mt-4 p-4 border rounded-lg bg-muted/50 space-y-3">
      <div className="flex items-start gap-3">
        {metadata.image ? (
          <img
            src={metadata.image}
            alt="Preview"
            className="h-20 w-20 object-cover rounded border"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="h-20 w-20 flex items-center justify-center rounded border bg-background">
            <Globe className="h-8 w-8 text-muted-foreground" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {metadata.title && (
            <p className="font-semibold text-sm line-clamp-2">{metadata.title}</p>
          )}
          {metadata.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {metadata.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2 truncate">
            {getHostname(url)}
          </p>
        </div>
      </div>

      {metadata.title && (
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-[10px]">
            {metadata.source === "local" ? "Fallback local" : "Fonte web"}
          </Badge>
          <Badge variant="outline" className="text-[10px]">Título</Badge>
          {metadata.description && <Badge variant="outline" className="text-[10px]">Descrição</Badge>}
          {metadata.image && <Badge variant="outline" className="text-[10px]">Imagem</Badge>}
        </div>
      )}
    </div>
  );
}
