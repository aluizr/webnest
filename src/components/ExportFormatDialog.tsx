import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileJson, FileText, FileSpreadsheet, Bookmark } from "lucide-react";
import { downloadFile, exportAsJSON, exportAsCSV, exportAsHTML, exportAsBookmarks } from "@/lib/export";
import { TEXT_XS_CLASS } from "@/lib/utils";
import type { LinkItem, Category } from "@/types/link";

interface ExportFormatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  links: LinkItem[];
  categories?: Category[];
}

type ExportFormat = "json" | "csv" | "html" | "bookmarks";

const formats: Array<{
  id: ExportFormat;
  name: string;
  description: string;
  icon: React.ReactNode;
  extension: string;
}> = [
  {
    id: "json",
    name: "JSON",
    description: "Importação/exportação completa com todos os dados",
    icon: <FileJson className="h-8 w-8" />,
    extension: "json",
  },
  {
    id: "csv",
    name: "CSV",
    description: "Compatível com Excel, Google Sheets e outras ferramentas",
    icon: <FileSpreadsheet className="h-8 w-8" />,
    extension: "csv",
  },
  {
    id: "html",
    name: "HTML",
    description: "Documento formatado e legível para visualização/impressão",
    icon: <FileText className="h-8 w-8" />,
    extension: "html",
  },
  {
    id: "bookmarks",
    name: "Bookmarks",
    description: "Importe de volta para Chrome, Firefox, Safari, Edge...",
    icon: <Bookmark className="h-8 w-8 text-blue-600" />,
    extension: "html",
  },
];

export function ExportFormatDialog({ isOpen, onClose, links, categories }: ExportFormatDialogProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: ExportFormat) => {
    setExporting(true);
    try {
      let blob: Blob;
      let filename: string;
      const timestamp = new Date().toISOString().slice(0, 10);

      switch (format) {
        case "json":
          blob = exportAsJSON(links);
          filename = `links-${timestamp}.json`;
          break;
        case "csv":
          blob = exportAsCSV(links);
          filename = `links-${timestamp}.csv`;
          break;
        case "html":
          blob = exportAsHTML(links, "Meus Links");
          filename = `links-${timestamp}.html`;
          break;
        case "bookmarks":
          blob = exportAsBookmarks(links, categories);
          filename = `bookmarks-${timestamp}.html`;
          break;
      }

      downloadFile(blob, filename);
      onClose();
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Escolha o Formato de Exportação</DialogTitle>
          <DialogDescription>Selecione como deseja exportar seus links</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          {formats.map((format) => (
            <button
              key={format.id}
              onClick={() => handleExport(format.id)}
              disabled={exporting}
              className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
            >
              <div className="flex-shrink-0 text-muted-foreground">{format.icon}</div>
              <div className="flex-1">
                <p className="font-medium">{format.name}</p>
                <p className={`${TEXT_XS_CLASS} text-muted-foreground`}>{format.description}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
