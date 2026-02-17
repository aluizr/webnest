import { Undo2, Redo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DragDropOverlayProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isDragging: boolean;
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
}: DragDropOverlayProps) {
  return (
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
