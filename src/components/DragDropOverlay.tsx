import { Undo2, Redo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";

interface DragDropOverlayProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isDragging: boolean;
  draggedLink?: {
    title: string;
    url: string;
    ogImage?: string;
    category?: string;
    tags?: string[];
  } | null;
}

/**
 * Overlay com controles de Undo/Redo e feedback visual de drag
 */
export function DragDropOverlay({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isDragging,
  draggedLink,
}: DragDropOverlayProps) {
  const [cursor, setCursor] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isDragging) return;
    const handle = (e: MouseEvent) => setCursor({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handle);
    return () => window.removeEventListener("mousemove", handle);
  }, [isDragging]);

  return (
    <>
      {isDragging && draggedLink && (
        <div
          style={{
            position: "fixed",
            left: cursor.x + 24,
            top: cursor.y + 24,
            zIndex: 9999,
            pointerEvents: "none",
            minWidth: 180,
            maxWidth: 260,
            background: "white",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            border: "1.5px solid #d1d5db",
            padding: 12,
            opacity: 0.97,
            fontSize: 13,
            color: "#222",
            transition: "box-shadow 0.2s",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {draggedLink.ogImage ? (
              <img src={draggedLink.ogImage} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover", background: "#f3f4f6" }} />
            ) : (
              <span style={{ fontSize: 22, marginRight: 2 }}>🔗</span>
            )}
            <span style={{ fontWeight: 600, fontSize: 14, maxWidth: 170, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{draggedLink.title}</span>
          </div>
          {draggedLink.category && (
            <div style={{ marginTop: 6, fontSize: 12, color: "#6366f1", fontWeight: 500 }}>{draggedLink.category}</div>
          )}
          {draggedLink.tags && draggedLink.tags.length > 0 && (
            <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
              {draggedLink.tags.slice(0, 3).map((tag) => (
                <span key={tag} style={{ background: "#f1f5f9", color: "#334155", borderRadius: 4, padding: "1px 6px", fontSize: 11 }}>#{tag}</span>
              ))}
              {draggedLink.tags.length > 3 && (
                <span style={{ color: "#64748b", fontSize: 11 }}>+{draggedLink.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      )}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
      <TooltipProvider>
        {/* Undo Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onUndo}
              disabled={!canUndo}
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full shadow-lg hover:shadow-xl transition-all"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Desfazer (Ctrl+Z)</p>
          </TooltipContent>
        </Tooltip>

        {/* Redo Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onRedo}
              disabled={!canRedo}
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full shadow-lg hover:shadow-xl transition-all"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Refazer (Ctrl+Y)</p>
          </TooltipContent>
        </Tooltip>

        {/* Drag Status Indicator */}
        {isDragging && (
          <div className="ml-2 px-3 py-2 rounded-full bg-blue-50 border border-blue-200 animate-pulse">
            <p className="text-xs font-medium text-blue-700">∿ Arrastando...</p>
          </div>
        )}
      </TooltipProvider>
    </div>
  );
}
