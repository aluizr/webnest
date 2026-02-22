import { useState, useCallback, useRef } from "react";

export type LinkStatus = "unknown" | "checking" | "ok" | "broken" | "error";

interface LinkCheckResult {
  id: string;
  status: LinkStatus;
  statusCode?: number;
  checkedAt: string;
}

const CACHE_KEY = "webnest_link_check_cache";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function loadCache(): Record<string, LinkCheckResult> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const cache = JSON.parse(raw);
    // Purge expired entries
    const now = Date.now();
    const cleaned: Record<string, LinkCheckResult> = {};
    for (const [id, entry] of Object.entries(cache)) {
      const e = entry as LinkCheckResult;
      if (now - new Date(e.checkedAt).getTime() < CACHE_TTL) {
        cleaned[id] = e;
      }
    }
    return cleaned;
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, LinkCheckResult>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage full, ignore
  }
}

export function useLinkChecker() {
  const [results, setResults] = useState<Record<string, LinkCheckResult>>(loadCache);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState({ checked: 0, total: 0 });
  const abortRef = useRef<AbortController | null>(null);

  const checkLink = useCallback(async (id: string, url: string, signal?: AbortSignal): Promise<LinkCheckResult> => {
    try {
      // Use a HEAD request via a CORS proxy or direct fetch
      // Since most sites block direct HEAD from browsers, we use 
      // a simple fetch with mode: 'no-cors' — opaque response means OK
      // For a more accurate check we try 'cors' first, fallback to 'no-cors'
      let status: LinkStatus = "unknown";
      let statusCode: number | undefined;

      try {
        const res = await fetch(url, {
          method: "HEAD",
          mode: "cors",
          signal,
          redirect: "follow",
        });
        statusCode = res.status;
        status = res.ok ? "ok" : "broken";
      } catch {
        // CORS blocked — try no-cors (opaque response = at least server responded)
        try {
          const res = await fetch(url, {
            method: "HEAD",
            mode: "no-cors",
            signal,
          });
          // Opaque responses have type 'opaque' and status 0
          // If we get here without throwing, the server is reachable
          status = res.type === "opaque" ? "ok" : "broken";
        } catch {
          status = "broken";
        }
      }

      return { id, status, statusCode, checkedAt: new Date().toISOString() };
    } catch {
      return { id, status: "error", checkedAt: new Date().toISOString() };
    }
  }, []);

  const checkLinks = useCallback(async (links: { id: string; url: string }[]) => {
    if (checking) return;

    // Abort previous check if any
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setChecking(true);
    setProgress({ checked: 0, total: links.length });

    const cache = { ...results };

    // Mark all as checking
    const checkingResults: Record<string, LinkCheckResult> = {};
    for (const link of links) {
      checkingResults[link.id] = { id: link.id, status: "checking", checkedAt: new Date().toISOString() };
    }
    setResults((prev) => ({ ...prev, ...checkingResults }));

    // Check in batches of 5 to avoid overwhelming the browser
    const BATCH_SIZE = 5;
    let checked = 0;

    for (let i = 0; i < links.length; i += BATCH_SIZE) {
      if (controller.signal.aborted) break;

      const batch = links.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((link) => checkLink(link.id, link.url, controller.signal))
      );

      for (const result of batchResults) {
        cache[result.id] = result;
      }

      checked += batch.length;
      setProgress({ checked, total: links.length });
      setResults({ ...cache });
    }

    saveCache(cache);
    setChecking(false);
    abortRef.current = null;
  }, [checking, results, checkLink]);

  const cancelCheck = useCallback(() => {
    abortRef.current?.abort();
    setChecking(false);
  }, []);

  const getStatus = useCallback((id: string): LinkStatus => {
    return results[id]?.status ?? "unknown";
  }, [results]);

  const getBrokenCount = useCallback((): number => {
    return Object.values(results).filter((r) => r.status === "broken").length;
  }, [results]);

  const clearResults = useCallback(() => {
    setResults({});
    localStorage.removeItem(CACHE_KEY);
  }, []);

  return {
    results,
    checking,
    progress,
    checkLinks,
    cancelCheck,
    getStatus,
    getBrokenCount,
    clearResults,
  };
}
