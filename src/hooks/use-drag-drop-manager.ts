import { useEffect, useRef, useState, useCallback } from "react";
import type { LinkItem, Category } from "@/types/link";

export interface DragDropState {
  draggedLink: LinkItem | null;
  dropZoneId: string | null; // ID do link/categoria onde será inserido
  dragPreviewPosition: { x: number; y: number };
  isDraggingOverCategory: boolean;
  dragDirection?: "above" | "below"; // Direção onde o link será inserido
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
export function useDragDropManager(initialLinks: LinkItem[], categories: Category[], onReorder?: (links: LinkItem[]) => void) {
  const [dragState, setDragState] = useState<DragDropState>({
    draggedLink: null,
    dropZoneId: null,
    dragPreviewPosition: { x: 0, y: 0 },
    isDraggingOverCategory: false,
    dragDirection: undefined,
  });

  const [history, setHistory] = useState<DragDropHistory[]>(() => [
    { links: initialLinks, timestamp: Date.now() }
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const autoScrollRef = useRef<NodeJS.Timeout>();
  const dragImageRef = useRef<HTMLDivElement>(null);
  const lastLinksRef = useRef<LinkItem[]>(initialLinks);
  const lastDragOverRef = useRef<{ targetId: string | null; direction: "above" | "below" | undefined }>({
    targetId: null,
    direction: undefined,
  });

  // Sincronizar histórico quando links mudam externamente (de use-links)
  useEffect(() => {
    // Se links mudaram e estamos no final do histórico
    if (historyIndex === history.length - 1) {
      const lastState = history[historyIndex];
      const linksChanged = 
        lastState?.links.length !== initialLinks.length ||
        lastState?.links.some((l, i) => l.id !== initialLinks[i]?.id);
      
      if (linksChanged) {
        setHistory((prev) => [
          ...prev,
          { links: initialLinks, timestamp: Date.now() }
        ]);
        setHistoryIndex((prev) => prev + 1);
      }
    }
    lastLinksRef.current = initialLinks;
  }, [initialLinks, historyIndex, history]);

  // Função para adicionar novo estado ao histórico
  const addToHistory = useCallback((links: LinkItem[]) => {
    setHistory((prev) => {
      // Remove estados futuros se voltou no histórico e faz uma ação
      const currentLength = prev.length;
      // Não usar historyIndex aqui pois pode estar desatualizado
      // Em vez disso, sempre adicionar ao final
      return [...prev, { links, timestamp: Date.now() }];
    });
    setHistoryIndex((prev) => prev + 1);
  }, []);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const previousIndex = historyIndex - 1;
      setHistoryIndex(previousIndex);
      const previousLinks = history[previousIndex].links;
      if (onReorder) {
        onReorder(previousLinks);
      }
    }
  }, [historyIndex, history, onReorder]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      const nextLinks = history[nextIndex].links;
      if (onReorder) {
        onReorder(nextLinks);
      }
    }
  }, [historyIndex, history, onReorder]);

  // Obter estado atual do histórico
  const getCurrentLinks = useCallback((): LinkItem[] => {
    if (historyIndex >= 0 && historyIndex < history.length && history[historyIndex]) {
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

  // Drag over - detecta direção do arrasto com cache
  const handleDragOver = useCallback(
    (e: React.DragEvent, targetId?: string, isCategory?: boolean) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = "move";

      // Calcular a direção com base na posição vertical do mouse
      let dragDirection: "above" | "below" | undefined = undefined;
      const element = e.currentTarget as HTMLElement;
      if (element && targetId) {
        const rect = element.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        dragDirection = e.clientY < midpoint ? "above" : "below";
      }

      // Comparar com os últimos valores - só atualizar se realmente mudou
      const lastOver = lastDragOverRef.current;
      const hasChanged = 
        lastOver.targetId !== targetId || 
        lastOver.direction !== dragDirection;

      if (hasChanged) {
        lastDragOverRef.current = { targetId: targetId || null, direction: dragDirection };
        setDragState((prev) => ({
          ...prev,
          dropZoneId: targetId || null,
          isDraggingOverCategory: isCategory || false,
          dragDirection,
        }));
      }

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
    lastDragOverRef.current = { targetId: null, direction: undefined };
    setDragState((prev) => ({
      ...prev,
      dropZoneId: null,
      isDraggingOverCategory: false,
      dragDirection: undefined,
    }));
  }, []);

  // Drag end
  const handleDragEnd = useCallback(() => {
    lastDragOverRef.current = { targetId: null, direction: undefined };
    setDragState({
      draggedLink: null,
      dropZoneId: null,
      dragPreviewPosition: { x: 0, y: 0 },
      isDraggingOverCategory: false,
      dragDirection: undefined,
    });

    if (autoScrollRef.current) {
      clearTimeout(autoScrollRef.current);
    }
  }, []);

  // Reordenar links usando initialLinks (dados reais do parent)
  const reorderLinks = useCallback(
    (dragId: string, targetId: string, direction?: "above" | "below", isCategory?: boolean): LinkItem[] | null => {
      // Sempre usar initialLinks como fonte de verdade
      const currentLinks = initialLinks;
      const dragIndex = currentLinks.findIndex((l) => l.id === dragId);
      const targetIndex = currentLinks.findIndex((l) => l.id === targetId);

      if (dragIndex === -1 || targetIndex === -1) return null;
      if (dragIndex === targetIndex) return null;

      const newLinks = [...currentLinks];
      const [draggedItem] = newLinks.splice(dragIndex, 1);

      // Calcular índice de inserção com base na direção
      let insertIndex = targetIndex;
      
      if (dragIndex < targetIndex) {
        // Item estava ANTES do alvo - índice diminui após remoção
        insertIndex = targetIndex - 1;
      }
      
      // Ajustar para "below" inserir DEPOIS do alvo
      if (direction === "below") {
        insertIndex = insertIndex + 1;
      }

      if (isCategory) {
        // Mover para categoria
        const updatedLink = {
          ...draggedItem,
          category: targetId, // targetId é o nome da categoria
        };
        newLinks.splice(insertIndex, 0, updatedLink);
      } else {
        // Reordenar dentro dos links
        newLinks.splice(insertIndex, 0, draggedItem);
      }

      // Atualizar posições
      const reordered = newLinks.map((link, index) => ({
        ...link,
        position: index,
      }));

      return reordered;
    },
    [initialLinks]
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
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDragEnd,
    reorderLinks,
    undo,
    redo,
  };
}
