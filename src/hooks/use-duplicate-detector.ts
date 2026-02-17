import { useMemo } from "react";
import type { LinkItem } from "@/types/link";

export interface DuplicateResult {
  isDuplicate: boolean;
  duplicateLink?: LinkItem;
  normalizedUrl: string;
}

/**
 * Normaliza URL para comparação, removendo protocolo, www, trailing slash, query params
 * Exemplos:
 *   https://www.example.com/page?id=123 → example.com/page
 *   http://example.com/ → example.com
 *   example.com/path#section → example.com/path
 */
function normalizeUrlForComparison(url: string): string {
  try {
    const urlObj = new URL(url);
    let normalized = urlObj.hostname || "";

    // Remove "www." no início
    if (normalized.startsWith("www.")) {
      normalized = normalized.slice(4);
    }

    // Adicionar caminho (sem query params e hash)
    const pathname = urlObj.pathname;
    if (pathname && pathname !== "/") {
      normalized += pathname;
    }

    // Remover trailing slash
    normalized = normalized.replace(/\/$/, "");

    return normalized.toLowerCase();
  } catch {
    // Se a URL for inválida, retornar a original em lowercase
    return url.toLowerCase();
  }
}

/**
 * Hook para detectar links duplicados
 * Compara a URL atual com todos os links existentes
 * Ignora o link em edição (se houver)
 *
 * @param url URL a ser verificada
 * @param links Lista de links existentes
 * @param editingLinkId ID do link que está sendo editado (opcional)
 * @returns Resultado da detecção com informações do link duplicado
 */
export function useDuplicateDetector(
  url: string,
  links: LinkItem[],
  editingLinkId?: string | null
): DuplicateResult {
  return useMemo(() => {
    if (!url.trim()) {
      return {
        isDuplicate: false,
        normalizedUrl: "",
      };
    }

    const normalizedSearchUrl = normalizeUrlForComparison(url);

    // Procurar duplicata (ignorando o link em edição)
    const duplicate = links.find((link) => {
      if (editingLinkId && link.id === editingLinkId) {
        return false; // Ignorar link em edição
      }

      const normalizedExistingUrl = normalizeUrlForComparison(link.url);
      return normalizedExistingUrl === normalizedSearchUrl;
    });

    return {
      isDuplicate: !!duplicate,
      duplicateLink: duplicate,
      normalizedUrl: normalizedSearchUrl,
    };
  }, [url, links, editingLinkId]);
}
