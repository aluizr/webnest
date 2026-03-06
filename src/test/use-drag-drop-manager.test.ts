import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDragDropManager } from "@/hooks/use-drag-drop-manager";
import type { LinkItem, Category } from "@/types/link";

function makeLink(overrides: Partial<LinkItem> = {}): LinkItem {
  return {
    id: "1",
    url: "https://example.com",
    title: "Example",
    description: "",
    category: "General",
    tags: [],
    isFavorite: false,
    favicon: "",
    ogImage: "",
    notes: "",
    status: "backlog",
    priority: "medium",
    dueDate: null,
    createdAt: "2025-01-15T12:00:00Z",
    position: 0,
    ...overrides,
  };
}

const testLinks: LinkItem[] = [
  makeLink({ id: "a", title: "Link A", position: 0 }),
  makeLink({ id: "b", title: "Link B", position: 1 }),
  makeLink({ id: "c", title: "Link C", position: 2 }),
];

const testCategories: Category[] = [
  { id: "cat-1", name: "Dev", icon: "Code" },
  { id: "cat-2", name: "Design", icon: "Palette" },
];

describe("useDragDropManager", () => {
  describe("initial state", () => {
    it("starts with no dragged link", () => {
      const { result } = renderHook(() => useDragDropManager(testLinks, testCategories));
      expect(result.current.dragState.draggedLink).toBeNull();
      expect(result.current.dragState.dropZoneId).toBeNull();
      expect(result.current.dragState.isDraggingOverCategory).toBe(false);
    });

    it("cannot undo or redo initially", () => {
      const { result } = renderHook(() => useDragDropManager(testLinks, testCategories));
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe("reorderLinks", () => {
    it("reorders links forward (drag a to position of c)", () => {
      const { result } = renderHook(() => useDragDropManager(testLinks, testCategories));
      const reordered = result.current.reorderLinks("a", "c");
      expect(reordered).not.toBeNull();
      // Item takes the target's original position
      expect(reordered!.map((l) => l.id)).toEqual(["b", "a", "c"]);
    });

    it("reorders links backward (drag c to position of a)", () => {
      const { result } = renderHook(() => useDragDropManager(testLinks, testCategories));
      const reordered = result.current.reorderLinks("c", "a");
      expect(reordered).not.toBeNull();
      expect(reordered!.map((l) => l.id)).toEqual(["c", "a", "b"]);
    });

    it("returns null when dragging to same position", () => {
      const { result } = renderHook(() => useDragDropManager(testLinks, testCategories));
      const reordered = result.current.reorderLinks("a", "a");
      expect(reordered).toBeNull();
    });

    it("returns null for invalid drag id", () => {
      const { result } = renderHook(() => useDragDropManager(testLinks, testCategories));
      const reordered = result.current.reorderLinks("nonexistent", "a");
      expect(reordered).toBeNull();
    });

    it("returns null for invalid target id", () => {
      const { result } = renderHook(() => useDragDropManager(testLinks, testCategories));
      const reordered = result.current.reorderLinks("a", "nonexistent");
      expect(reordered).toBeNull();
    });

    it("assigns correct positions after reorder", () => {
      const { result } = renderHook(() => useDragDropManager(testLinks, testCategories));
      const reordered = result.current.reorderLinks("a", "c");
      expect(reordered).not.toBeNull();
      reordered!.forEach((link, i) => {
        expect(link.position).toBe(i);
      });
    });
  });

  describe("drag end", () => {
    it("clears all drag state on drag end", () => {
      const { result } = renderHook(() => useDragDropManager(testLinks, testCategories));
      act(() => {
        result.current.handleDragEnd();
      });
      expect(result.current.dragState.draggedLink).toBeNull();
      expect(result.current.dragState.dropZoneId).toBeNull();
      expect(result.current.dragState.isDraggingOverCategory).toBe(false);
      expect(result.current.dragState.dragDirection).toBeUndefined();
    });
  });
});
