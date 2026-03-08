import { useEffect, useCallback } from "react";
import { useTheme } from "next-themes";

export interface KeyboardShortcutActions {
  /** Open new link form */
  onNewLink: () => void;
  /** Focus the search input */
  onFocusSearch: () => void;
  /** Toggle grid/list view */
  onToggleView: () => void;
  /** Open stats dashboard */
  onOpenStats: () => void;
  /** Open export dialog */
  onOpenExport: () => void;
  /** Open import dialog */
  onOpenImport: () => void;
  /** Open command palette */
  onOpenCommandPalette?: () => void;
}

/**
 * Global keyboard shortcuts for the app.
 *
 * | Key           | Action                |
 * |---------------|-----------------------|
 * | N             | New link              |
 * | / or Ctrl+K   | Focus search / Command palette |
 * | G             | Toggle grid/list      |
 * | D             | Toggle dark/light     |
 * | S             | Open stats            |
 * | E             | Open export           |
 * | I             | Open import           |
 * | Escape        | Blur active element   |
 *
 * Shortcuts are disabled when the user is typing in an input,
 * textarea, select, or contenteditable element (except Escape and Ctrl+K).
 */
export function useKeyboardShortcuts(actions: KeyboardShortcutActions) {
  const { theme, setTheme } = useTheme();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      const isEditable =
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target.isContentEditable;

      // Ctrl+K — open command palette if available, otherwise focus search
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (actions.onOpenCommandPalette) {
          actions.onOpenCommandPalette();
        } else {
          actions.onFocusSearch();
        }
        return;
      }

      // Escape — blur current element
      if (e.key === "Escape") {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        return;
      }

      // Don't trigger single-key shortcuts while typing
      if (isEditable) return;

      // Don't trigger if any modifier is held (except shift for ?)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case "n":
          e.preventDefault();
          actions.onNewLink();
          break;
        case "/":
          e.preventDefault();
          if (actions.onOpenCommandPalette) {
            actions.onOpenCommandPalette();
          } else {
            actions.onFocusSearch();
          }
          break;
        case "g":
          e.preventDefault();
          actions.onToggleView();
          break;
        case "d":
          e.preventDefault();
          {
            const allThemes = ["light", "paper", "mint", "peach", "dark", "ocean", "sunset", "forest", "rose", "lavender", "midnight"];
            const currentIndex = allThemes.indexOf(theme ?? "light");
            const nextIndex = (currentIndex + 1) % allThemes.length;
            setTheme(allThemes[nextIndex]);
          }
          break;
        case "s":
          e.preventDefault();
          actions.onOpenStats();
          break;
        case "e":
          e.preventDefault();
          actions.onOpenExport();
          break;
        case "i":
          e.preventDefault();
          actions.onOpenImport();
          break;
        case "?":
          // Reserved for future help overlay
          break;
      }
    },
    [actions, theme, setTheme]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
