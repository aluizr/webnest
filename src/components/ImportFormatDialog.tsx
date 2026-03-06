import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Loader2, FileJson, FileText, Bookmark } from "lucide-react";
import { parseCSV, parseHTML, parseJSON, parseBookmarks } from "@/lib/import";
import { linkSchema } from "@/lib/validation";
import { TEXT_XS_CLASS } from "@/lib/utils";
import { toast } from "sonner";
import type { LinkItem } from "@/types/link";

interface ImportFormatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (links: Omit<LinkItem, "id" | "createdAt" | "position">[]) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

type ImportType = 'json' | 'csv' | 'html' | 'bookmarks';

export function ImportFormatDialog({ isOpen, onClose, onImport }: ImportFormatDialogProps) {
  const [importing, setImporting] = useState(false);
  const [importType, setImportType] = useState<ImportType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bookmarksInputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<{
    successCount: number;
    errorCount: number;
    errors: Array<{ row: number; error: string }>;
    links: Omit<LinkItem, "id" | "createdAt" | "position">[];
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
      let detectedType = importType;

      // Auto-detect bookmarks format (has <!DOCTYPE NETSCAPE-Bookmark-file-1> or contains <DT><A HREF)
      if (
        content.includes("<!DOCTYPE NETSCAPE-Bookmark-file-1") ||
        content.includes("NETSCAPE-Bookmark-file") ||
        (content.includes("<DT>") && content.includes("<A HREF"))
      ) {
        parseResult = parseBookmarks(content);
        detectedType = 'bookmarks';
      } else {
        switch (extension) {
          case "json":
            parseResult = parseJSON(content);
            detectedType = 'json';
            break;
          case "csv":
            parseResult = parseCSV(content);
            detectedType = 'csv';
            break;
          case "html":
            parseResult = parseHTML(content);
            detectedType = 'html';
            break;
          default:
            toast.error("Formato de arquivo não suportado. Use JSON, CSV, HTML ou Bookmarks.");
            return;
        }
      }

      setResult(parseResult);
      setImportType(detectedType);

      if (parseResult.errorCount > 0) {
        toast.warning(
          `⚠️ ${parseResult.successCount} link(s) importado(s), ${parseResult.errorCount} com erro`
        );
      } else if (parseResult.successCount > 0) {
        toast.success(`✅ ${parseResult.successCount} link(s) encontrado(s)`);
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
    setImportType(null);
    onClose();
  };

  const triggerFileInput = (type: ImportType) => {
    setImportType(type);
    if (type === 'bookmarks') {
      bookmarksInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {result ? "Confirmar Importação" : "Importar Links"}
          </DialogTitle>
          <DialogDescription>
            {result ? "Revise e confirme os links" : "Selecione o formato do arquivo"}
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="flex flex-col items-center justify-center h-24 gap-2"
                onClick={() => triggerFileInput('json')}
                disabled={importing}
              >
                <FileJson className="h-6 w-6" />
                <span className={`${TEXT_XS_CLASS} font-medium`}>JSON</span>
              </Button>

              <Button
                variant="outline"
                className="flex flex-col items-center justify-center h-24 gap-2"
                onClick={() => triggerFileInput('csv')}
                disabled={importing}
              >
                <FileText className="h-6 w-6" />
                <span className={`${TEXT_XS_CLASS} font-medium`}>CSV</span>
              </Button>

              <Button
                variant="outline"
                className="flex flex-col items-center justify-center h-24 gap-2"
                onClick={() => triggerFileInput('html')}
                disabled={importing}
              >
                <FileText className="h-6 w-6" />
                <span className={`${TEXT_XS_CLASS} font-medium`}>HTML</span>
              </Button>

              <Button
                variant="outline"
                className="flex flex-col items-center justify-center h-24 gap-2 border-blue-200 hover:bg-blue-50"
                onClick={() => triggerFileInput('bookmarks')}
                disabled={importing}
              >
                <Bookmark className="h-6 w-6 text-blue-600" />
                <span className={`${TEXT_XS_CLASS} font-medium`}>Bookmarks</span>
              </Button>
            </div>

            <div hidden>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json,.csv,.html"
                onChange={handleFileSelect}
                aria-hidden="true"
              />
              <input
                type="file"
                ref={bookmarksInputRef}
                accept=".html"
                onChange={handleFileSelect}
                aria-hidden="true"
              />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className={TEXT_XS_CLASS}>
                <strong>Bookmarks:</strong> Exporte os bookmarks do seu navegador (Chrome, Firefox, Safari, Edge) e importe aqui.
                Pastas de bookmarks se tornarão categorias.
              </AlertDescription>
            </Alert>

            {importing && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Processando...</p>
              </div>
            )}
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
                    <div className={`mt-2 ${TEXT_XS_CLASS} space-y-1 bg-muted p-2 rounded overflow-auto max-h-48`}>
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
