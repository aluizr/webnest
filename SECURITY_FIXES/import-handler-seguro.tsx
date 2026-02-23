// src/pages/Index.tsx - FUNÇÃO handleImport SEGURA
// Substitua a função handleImport existente por esta versão

import { linkSchema } from "../schemas/linkSchema";
import { toast } from "react-toastify";
import { addLink } from "../addLink";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_LINKS_PER_IMPORT = 1000;

const handleImport = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";

  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // Validação 1: Tamanho do arquivo
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`Arquivo muito grande (máx ${MAX_FILE_SIZE / 1024 / 1024}MB, seu arquivo tem ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      return;
    }

    // Validação 2: Tipo MIME
    if (file.type && file.type !== "application/json") {
      toast.error("Apenas arquivos JSON são permitidos");
      return;
    }

    let fileContent: string;
    try {
      fileContent = await file.text();
    } catch (error) {
      toast.error("Erro ao ler o arquivo");
      console.error(error);
      return;
    }

    let imported: unknown;
    try {
      imported = JSON.parse(fileContent);
    } catch (error) {
      toast.error("Formato JSON inválido");
      console.error(error);
      return;
    }

    // Validação 3: Verificar se é um array
    if (!Array.isArray(imported)) {
      toast.error("Arquivo deve conter um array de links");
      return;
    }

    // Validação 4: Limitar quantidade de links
    if (imported.length > MAX_LINKS_PER_IMPORT) {
      toast.error(`Máximo de ${MAX_LINKS_PER_IMPORT} links por importação (seu arquivo tem ${imported.length})`);
      return;
    }

    // Validação 5: Array vazio
    if (imported.length === 0) {
      toast.error("Nenhum link encontrado no arquivo");
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let index = 0; index < imported.length; index++) {
      const item = imported[index];

      // Validar cada link individualmente com Zod
      const validation = linkSchema.safeParse({
        url: item.url,
        title: item.title || item.url,
        description: item.description ?? "",
        category: item.category ?? "",
        tags: Array.isArray(item.tags) ? item.tags : [],
        isFavorite: Boolean(item.isFavorite),
        favicon: item.favicon ?? "",
      });

      if (!validation.success) {
        errorCount++;
        const errorMsg = validation.error.errors[0]?.message || "Erro de validação";
        errors.push(`Link ${index + 1}: ${errorMsg}`);
        continue;
      }

      try {
        await addLink(validation.data);
        successCount++;
      } catch (error) {
        errorCount++;
        errors.push(`Link ${index + 1}: Erro ao adicionar link`);
        console.error(`Erro ao adicionar link ${index + 1}:`, error);
      }
    }

    // Feedback detalhado
    if (successCount > 0) {
      toast.success(`✅ ${successCount} link(s) importado(s) com sucesso!`);
    }

    if (errorCount > 0) {
      toast.error(`⚠️ ${errorCount} erro(s) encontrado(s)`);
      if (errors.length <= 5) {
        console.error("Erros de validação:", errors.join("\n"));
      }
    }
  };

  input.click();
};

export default handleImport;
