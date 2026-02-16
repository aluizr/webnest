import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { parseCSV, parseHTML, parseJSON } from "@/lib/import";
import { linkSchema } from "@/lib/validation";
import { toast } from "sonner";
import type { LinkItem } from "@/types/link";

interface ImportFormatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (links: Omit<LinkItem, "id" | "createdAt" | "position">[]) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function ImportFormatDialog({ isOpen, onClose, onImport }: ImportFormatDialogProps) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    successCount: number;
    errorCount: number;
    errors: Array<{ row: number; error: string }>;
  } | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`Arquivo muito grande (máx ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
        return;
      }

      const content = await file.text();
      const extension = file.name.split('.').pop()?.toLowerCase();

      let parseResult;

      switch (extension) {
        case "json":
          parseResult = parseJSON(content);
          break;
        case "csv":
          parseResult = parseCSV(content);
          break;
        case "html":
          parseResult = parseHTML(content);
          break;
        default:
          toast.error("Formato de arquivo não suportado. Use JSON, CSV ou HTML.");
          return;
      }

      setResult(parseResult);

      if (parseResult.errorCount > 0) {
        toast.warning(
          `⚠️ ${parseResult.successCount} link(s) importado(s), ${parseResult.errorCount} com erro`
        );
      }
    } catch (err) {
      toast.error("Erro ao ler o arquivo");
      console.error(err);
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmImport = () => {
    if (!result || result.successCount === 0) {
      toast.error("Nenhum link válido para importar");
      return;
    }

    onImport(result.links);
    onClose();
    setResult(null);
    toast.success(`✅ ${result.successCount} link(s) importado(s) com sucesso!`);
  };

  const handleCancel = () => {
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Links</DialogTitle>
          <DialogDescription>
            Suportados: JSON, CSV ou HTML
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                type="file"
                id="import-file"
                accept=".json,.csv,.html"
                onChange={handleFileSelect}
                disabled={importing}
                className="hidden"
              />
              <label
                htmlFor="import-file"
                className="flex flex-col items-center gap-2 cursor-pointer"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm font-medium">Processando...</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium">Clique para selecionar arquivo</p>
                    <p className="text-xs text-muted-foreground">ou arraste para cá</p>
                  </>
                )}
              </label>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Máximo 5MB. Arquivos duplicados não serão adicionados novamente.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="space-y-4">
            {result.successCount > 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  ✅ {result.successCount} link(s) pronto(s) para importar
                </AlertDescription>
              </Alert>
            )}

            {result.errorCount > 0 && (
              <div className="space-y-2">
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    ⚠️ {result.errorCount} link(s) com erro (ignorado(s))
                  </AlertDescription>
                </Alert>

                {result.errors.length > 0 && (
                  <details className="cursor-pointer">
                    <summary className="text-sm font-medium text-muted-foreground hover:text-foreground">
                      Ver detalhes dos erros
                    </summary>
                    <div className="mt-2 text-xs space-y-1 bg-muted p-2 rounded overflow-auto max-h-48">
                      {result.errors.slice(0, 10).map((err, i) => (
                        <p key={i} className="text-red-600">
                          Linha {err.row}: {err.error}
                        </p>
                      ))}
                      {result.errors.length > 10 && (
                        <p className="text-muted-foreground">... e mais {result.errors.length - 10}</p>
                      )}
                    </div>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setResult(null)}>
                Voltar
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={result.successCount === 0}
              >
                Importar {result.successCount > 0 && `(${result.successCount})`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
