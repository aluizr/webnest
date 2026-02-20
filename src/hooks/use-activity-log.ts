import { useState, useCallback } from "react";
import type { ActivityLogEntry, ActivityAction } from "@/types/link";

const MAX_LOG_ENTRIES = 200;
const STORAGE_KEY = "webnest:activity-log";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadFromStorage(): ActivityLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ActivityLogEntry[];
  } catch {
    return [];
  }
}

function saveToStorage(entries: ActivityLogEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_LOG_ENTRIES)));
  } catch {
    // localStorage full or unavailable
  }
}

const ACTION_LABELS: Record<ActivityAction, string> = {
  "link:created": "Link adicionado",
  "link:updated": "Link atualizado",
  "link:deleted": "Link excluído",
  "link:favorited": "Link favoritado",
  "link:unfavorited": "Link desfavoritado",
  "link:reordered": "Links reordenados",
  "category:created": "Categoria criada",
  "category:deleted": "Categoria excluída",
  "category:renamed": "Categoria renomeada",
  "import:completed": "Importação concluída",
  "export:completed": "Exportação concluída",
};

export { ACTION_LABELS };

export function useActivityLog() {
  const [entries, setEntries] = useState<ActivityLogEntry[]>(loadFromStorage);

  const logActivity = useCallback((action: ActivityAction, title: string, details?: string) => {
    const entry: ActivityLogEntry = {
      id: generateId(),
      action,
      title,
      details,
      timestamp: new Date().toISOString(),
    };

    setEntries((prev) => {
      const updated = [entry, ...prev].slice(0, MAX_LOG_ENTRIES);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const clearLog = useCallback(() => {
    setEntries([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { entries, logActivity, clearLog };
}
