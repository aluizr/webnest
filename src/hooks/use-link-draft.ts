import { useEffect, useState, useCallback } from "react";

export interface LinkDraft {
  url: string;
  title: string;
  description: string;
  notes: string;
  selectedCategoryId: string;
  status?: "backlog" | "in_progress" | "done";
  priority?: "low" | "medium" | "high";
  dueDate?: string | null;
  // Mantidos para compatibilidade com rascunhos antigos
  selectedParentId?: string;
  selectedChildId?: string;
  tags: string[];
  favicon: string;
  ogImage?: string;
}

const DRAFT_STORAGE_KEY = "link-draft";
const DRAFT_TIMEOUT = 500; // ms - debounce interval

/**
 * Hook para auto-save de rascunhos de links
 * Salva o estado do formulário em localStorage com debounce
 * Restaura o rascunho ao abrir o formulário (se não estiver editando um link)
 * Limpa após envio bem-sucedido
 */
export function useLinkDraft() {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftData, setDraftData] = useState<LinkDraft | null>(null);

  // Verificar se existe rascunho ao montar
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        setDraftData(draft);
        setHasDraft(true);
      } catch (e) {
        console.error("Erro ao restaurar rascunho:", e);
      }
    }
  }, []);

  // Salvar rascunho com debounce
  const saveDraft = useCallback((data: LinkDraft) => {
    // Se a URL estiver vazia, não salva
    if (!data.url.trim()) {
      clearDraft();
      return;
    }

    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
      setHasDraft(true);
    } catch (e) {
      console.error("Erro ao salvar rascunho:", e);
    }
  }, []);

  // Restaurar rascunho anterior
  const restoreDraft = useCallback((): LinkDraft | null => {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!saved) return null;

    try {
      const draft = JSON.parse(saved);
      setDraftData(draft);
      return draft;
    } catch (e) {
      console.error("Erro ao restaurar rascunho:", e);
      return null;
    }
  }, []);

  // Limpar rascunho (chamado após envio bem-sucedido)
  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setHasDraft(false);
    setDraftData(null);
  }, []);

  // Descartar rascunho (opção manual do usuário)
  const discardDraft = useCallback(() => {
    clearDraft();
  }, [clearDraft]);

  return {
    hasDraft,
    draftData,
    saveDraft,
    restoreDraft,
    clearDraft,
    discardDraft,
  };
}
