import { useEffect, useRef, useState, useCallback } from "react";
import type { LinkItem, Category } from "@/types/link";

export interface DragDropState {
  draggedLink: LinkItem | null;
  dropZoneId: string | null; // ID do link/categoria onde será inserido
  dragPreviewPosition: { x: number; y: number };
  isDraggingOverCategory: boolean;
}

export interface DragDropHistory {
  links: LinkItem[];
  timestamp: number;
}

/**
 * Hook aprimorado para Drag & Drop com:
 * - Histórico (Undo/Redo)
 * - Auto-scroll
 * - Drag entre categorias
 * - Drop zones visuais
 * - Suporte a teclado (Ctrl+Z, Ctrl+Y)
 */
export function useDragDropManager(initialLinks: LinkItem[], categories: Category[]) {
  const [dragState, setDragState] = useState<DragDropState>({
    draggedLink: null,
    dropZoneId: null,
    dragPreviewPosition: { x: 0, y: 0 },
    isDraggingOverCategory: false,
  });

  const [history, setHistory] = useState<DragDropHistory[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const autoScrollRef = useRef<NodeJS.Timeout>();
  const dragImageRef = useRef<HTMLDivElement>(null);

  // Inicializar histórico com estado inicial
  useEffect(() => {
    setHistory([{ links: initialLinks, timestamp: Date.now() }]);
    setHistoryIndex(0);
  }, []);

  // Função para adicionar novo estado ao histórico
  const addToHistory = useCallback((links: LinkItem[]) => {
    setHistory((prev) => {
      // Remove estados futuros se voltou no histórico e faz uma ação
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ links, timestamp: Date.now() });
      return newHistory;
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
    }
  }, [historyIndex]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1);
    }
  }, [historyIndex, history.length]);

  // Obter estado atual do histórico
  const getCurrentLinks = useCallback((): LinkItem[] => {
    if (historyIndex >= 0 && historyIndex < history.length) {
      return history[historyIndex].links;
    }
    return initialLinks;
  }, [history, historyIndex, initialLinks]);

  // Auto-scroll ao arrastar perto das bordas
  const handleAutoScroll = useCallback((clientY: number) => {
    const scrollContainer = document.querySelector("main") || window;
    const container = scrollContainer === window ? document.documentElement : (scrollContainer as HTMLElement);
    
    const threshold = 100; // pixels from top/bottom
    const scrollSpeed = 5;

    if (clientY < threshold) {
      container.scrollTop -= scrollSpeed;
    } else if (clientY > window.innerHeight - threshold) {
      container.scrollTop += scrollSpeed;
    }
  }, []);

  // Drag start
  const handleDragStart = useCallback(
    (e: React.DragEvent, link: LinkItem) => {
      setDragState((prev) => ({
        ...prev,
        draggedLink: link,
      }));

      // Criar drag image customizado
      const dragPreview = document.createElement("div");
      dragPreview.innerHTML = `
        <div style="
          background: white;
          border-radius: 8px;
          padding: 8px 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          font-size: 14px;
          font-weight: 500;
          color: #333;
          max-width: 200px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        ">
          🔗 ${link.title || link.url}
        </div>
      `;
      document.body.appendChild(dragPreview);
      e.dataTransfer!.setDragImage(dragPreview, 0, 0);

      setTimeout(() => document.body.removeChild(dragPreview), 0);

      e.dataTransfer!.effectAllowed = "move";
      e.dataTransfer!.setData("text/plain", link.id);
    },
    []
  );

  // Drag over
  const handleDragOver = useCallback(
    (e: React.DragEvent, targetId?: string, isCategory?: boolean) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = "move";

      setDragState((prev) => ({
        ...prev,
        dropZoneId: targetId || null,
        isDraggingOverCategory: isCategory || false,
      }));

      // Auto-scroll
      if (autoScrollRef.current) clearTimeout(autoScrollRef.current);
      autoScrollRef.current = setTimeout(() => {
        handleAutoScroll(e.clientY);
      }, 50);
    },
    [handleAutoScroll]
  );

  // Drag leave
  const handleDragLeave = useCallback(() => {
    setDragState((prev) => ({
      ...prev,
      dropZoneId: null,
      isDraggingOverCategory: false,
    }));
  }, []);

  // Drag end
  const handleDragEnd = useCallback(() => {
    setDragState({
      draggedLink: null,
      dropZoneId: null,
      dragPreviewPosition: { x: 0, y: 0 },
      isDraggingOverCategory: false,
    });

    if (autoScrollRef.current) {
      clearTimeout(autoScrollRef.current);
    }
  }, []);

  // Reordenar links
  const reorderLinks = useCallback(
    (dragId: string, targetId: string, isCategory?: boolean): LinkItem[] | null => {
      const currentLinks = getCurrentLinks();
      const dragIndex = currentLinks.findIndex((l) => l.id === dragId);

      if (dragIndex === -1) return null;

      const newLinks = [...currentLinks];
      const [draggedItem] = newLinks.splice(dragIndex, 1);

      if (isCategory) {
        // Mover para categoria
        const updatedLink = {
          ...draggedItem,
          category: targetId, // targetId é o nome da categoria
        };
        newLinks.splice(dragIndex, 0, updatedLink);
      } else {
        // Reordenar dentro dos links
        const targetIndex = newLinks.findIndex((l) => l.id === targetId);
        if (targetIndex === -1) return null;
        newLinks.splice(targetIndex, 0, draggedItem);
      }

      // Atualizar posições
      const reordered = newLinks.map((link, index) => ({
        ...link,
        position: index,
      }));

      addToHistory(reordered);
      return reordered;
    },
    [getCurrentLinks, addToHistory]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z ou Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Ctrl+Y, Ctrl+Shift+Z ou Cmd+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  return {
    dragState,
    history,
    historyIndex,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    getCurrentLinks,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDragEnd,
    reorderLinks,
    undo,
    redo,
    addToHistory,
  };
}
