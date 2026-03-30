import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink } from "lucide-react";

const NOTION_TOKEN_KEY = "webnest:notion_api_key";

interface NotionSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotionSettingsDialog({ open, onOpenChange }: NotionSettingsDialogProps) {
  const [token, setToken] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      const stored = localStorage.getItem(NOTION_TOKEN_KEY);
      setToken(stored || "");
      setSaved(false);
    }
  }, [open]);

  const handleSave = () => {
    const trimmed = token.trim();
    if (trimmed) {
      localStorage.setItem(NOTION_TOKEN_KEY, trimmed);
    } else {
      localStorage.removeItem(NOTION_TOKEN_KEY);
    }
    setSaved(true);
    setTimeout(() => {
      onOpenChange(false);
      setSaved(false);
    }, 1000);
  };

  const handleClear = () => {
    localStorage.removeItem(NOTION_TOKEN_KEY);
    setToken("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configuração da API do Notion</DialogTitle>
          <DialogDescription>
            Configure seu token de integração do Notion para importar metadados de páginas automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="notion-token">Token de Integração</Label>
            <Input
              id="notion-token"
              type="password"
              placeholder="secret_abc123..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              O token é armazenado apenas no seu navegador e nunca é enviado para nossos servidores.
            </p>
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <h4 className="text-sm font-medium">Como obter seu token:</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>
                Acesse{" "}
                <a
                  href="https://www.notion.com/my-integrations"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  notion.com/my-integrations
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>Clique em "Create new integration"</li>
              <li>Dê um nome (ex: "WebNest")</li>
              <li>Copie o "Internal Integration Token"</li>
              <li>Cole aqui e salve</li>
            </ol>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-4">
            <p className="text-sm text-amber-900 dark:text-amber-200">
              <strong>Importante:</strong> Você precisa compartilhar cada página do Notion com sua integração.
              No Notion, clique em "Share" → "Invite" → selecione sua integração.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {token && (
            <Button variant="outline" onClick={handleClear} type="button">
              Limpar Token
            </Button>
          )}
          <Button onClick={handleSave} disabled={saved}>
            {saved ? "✓ Salvo!" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
