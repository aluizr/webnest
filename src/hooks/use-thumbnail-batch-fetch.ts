import { useRef, useCallback } from "react";
import { toast } from "sonner";

const BATCH_SIZE = 2;        // parallel fetches at a time
const BATCH_DELAY_MS = 600;  // gap between batches to avoid hammering APIs
const FETCH_TIMEOUT_MS = 10000;

interface PendingItem {
  id: string;
  url: string;
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Try to fetch the best available og:image for a URL using the same chain as
 * use-metadata.ts but without touching the LRU cache (the image URL will be
 * persisted in the DB, so caching in localStorage is redundant here).
 *
 * Chain:
 *   1. Microlink API  (og:image field)
 *   2. /html-proxy    (server-side HTML scraping)
 *   3. Microlink screenshot (last resort)
 */
async function fetchOgImageForUrl(url: string): Promise<string | null> {
  // --- 1. Microlink ---
  try {
    const microlinkUrl = new URL("https://api.microlink.io");
    microlinkUrl.searchParams.set("url", url);
    microlinkUrl.searchParams.set("screenshot", "true");

    const res = await fetchWithTimeout(microlinkUrl.toString(), {
      headers: { Accept: "application/json" },
    });

    if (res.ok) {
      const data = await res.json();
      const d = data?.data;

      if (d) {
        // Try og:image first
        let image: string | null = d.image?.url || null;

        // Fail-safe: if Microlink returns an error-page screenshot ignore raw image
        const errorTitle = d.title && (
          /^error:/i.test(String(d.title).trim()) ||
          /^Attention Required!/i.test(String(d.title).trim()) ||
          /^Just a moment\.\.\./i.test(String(d.title).trim()) ||
          /Cloudflare/i.test(String(d.title).trim()) ||
          /Access Denied/i.test(String(d.title).trim()) ||
          /403 Forbidden/i.test(String(d.title).trim()) ||
          /Not Acceptable!/i.test(String(d.title).trim())
        );
        if (errorTitle) image = null;

        // Not in og:image → try /html-proxy
        if (!image) {
          try {
            const proxyRes = await fetchWithTimeout(`/html-proxy?url=${encodeURIComponent(url)}`);
            if (proxyRes.ok) {
              const proxyData = await proxyRes.json();
              if (proxyData?.ogImage) {
                try {
                  // Validate absolute URL
                  new URL(proxyData.ogImage);
                  image = proxyData.ogImage;
                } catch {
                  // Relative URL → make absolute
                  try {
                    image = new URL(proxyData.ogImage, new URL(url).origin).href;
                  } catch {
                    image = null;
                  }
                }
              }
            }
          } catch {
            // html-proxy failed silently
          }
        }

        // Still nothing → use screenshot (only if title doesn't look like an error)
        if (!image && d.screenshot?.url && !errorTitle) {
          image = d.screenshot.url;
        }

        if (image) return image;
      }
    }
  } catch {
    // Microlink unreachable — fall through
  }

  return null;
}

type UpdateLinkFn = (id: string, data: { ogImage: string }) => Promise<void> | void;

/**
 * Hook that exposes `startBatchThumbnailFetch`.
 *
 * After a bulk import, call:
 *   startBatchThumbnailFetch(importedItems, updateLink)
 *
 * where `importedItems` is the list of { id, url } for links that were just
 * persisted and still have no ogImage.
 */
export function useThumbnailBatchFetch() {
  const runningRef = useRef(false);

  const startBatchThumbnailFetch = useCallback(
    async (items: PendingItem[], updateLink: UpdateLinkFn) => {
      if (items.length === 0) return;
      if (runningRef.current) {
        console.warn("[useThumbnailBatchFetch] Already running, skipping new request.");
        return;
      }

      runningRef.current = true;

      let processed = 0;
      let found = 0;
      const total = items.length;

      const toastId = `thumb-batch-${Date.now()}`;
      toast.loading(`🖼 Buscando thumbnails… 0/${total}`, { id: toastId, duration: Infinity });

      try {
        for (let i = 0; i < items.length; i += BATCH_SIZE) {
          const batch = items.slice(i, i + BATCH_SIZE);

          await Promise.all(
            batch.map(async ({ id, url }) => {
              try {
                const ogImage = await fetchOgImageForUrl(url);
                if (ogImage) {
                  await updateLink(id, { ogImage });
                  found++;
                }
              } catch {
                // ignore per-link errors
              } finally {
                processed++;
                toast.loading(`🖼 Buscando thumbnails… ${processed}/${total}`, {
                  id: toastId,
                  duration: Infinity,
                });
              }
            })
          );

          // Pause between batches (skip after the last one)
          if (i + BATCH_SIZE < items.length) {
            await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
          }
        }
      } finally {
        runningRef.current = false;
        if (found > 0) {
          toast.success(`✅ ${found} thumbnail(s) carregada(s)`, { id: toastId, duration: 4000 });
        } else {
          toast.dismiss(toastId);
        }
      }
    },
    []
  );

  return { startBatchThumbnailFetch };
}
