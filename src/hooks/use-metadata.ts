import { useState, useCallback } from "react";

export interface LinkMetadata {
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  loading: boolean;
  error: string | null;
  source: "microlink" | "othermeta" | "noembed" | "local" | null;
}

// LRU cache with bounded size for metadata requests
class LRUCache<K, V> {
  private maxSize: number;
  private cache = new Map<K, { value: V; timestamp: number }>();
  private expiry: number;

  constructor(maxSize = 100, expiryMs = 24 * 60 * 60 * 1000) {
    this.maxSize = maxSize;
    this.expiry = expiryMs;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > this.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict oldest entry (first in Map iteration order)
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, { value, timestamp: Date.now() });
  }
}

const metadataCache = new LRUCache<string, LinkMetadata>(100);

const FETCH_TIMEOUT_MS = 8000;

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Normalize URL for consistent cache keys */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Remove trailing slash, lowercase host
    return u.origin.toLowerCase() + u.pathname.replace(/\/+$/, "") + u.search + u.hash;
  } catch {
    return url.trim().toLowerCase();
  }
}

function buildLocalFallback(url: string): LinkMetadata {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./i, "");
    return {
      title: host,
      description: null,
      image: null,
      favicon: `https://icon.horse/icon/${parsed.hostname}?size=32`,
      loading: false,
      error: null,
      source: "local",
    };
  } catch {
    return {
      title: null,
      description: null,
      image: null,
      favicon: null,
      loading: false,
      error: null,
      source: null,
    };
  }
}

/**
 * Try to extract metadata using Microlink API with fallback
 */
async function fetchFromMicrolink(url: string): Promise<LinkMetadata | null> {
  try {
    const microlinkUrl = new URL("https://api.microlink.io");
    microlinkUrl.searchParams.set("url", url);

    const response = await fetchWithTimeout(microlinkUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    // If 400, endpoint doesn't support this URL - return null for fallback
    if (response.status === 400) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.data) {
      return null;
    }

    return {
      title: data.data.title || null,
      description: data.data.description || null,
      image: data.data.image?.url || null,
      favicon: data.data.logo?.url || null,
      loading: false,
      error: null,
      source: "microlink",
    };
  } catch (err) {
    console.debug("Microlink error:", err);
    return null;
  }
}

/**
 * Fallback: use other-meta API which is more permissive
 */
async function fetchFromOtherMeta(url: string): Promise<LinkMetadata | null> {
  try {
    const otherMetaUrl = new URL("https://other.myjson.online/get-meta");
    otherMetaUrl.searchParams.set("url", url);

    const response = await fetchWithTimeout(otherMetaUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.meta) {
      return null;
    }

    return {
      title: data.meta.title || null,
      description: data.meta.description || null,
      image: data.meta.image || data.meta["og:image"] || null,
      favicon: null,
      loading: false,
      error: null,
      source: "othermeta",
    };
  } catch (err) {
    console.debug("OtherMeta error:", err);
    return null;
  }
}

/**
 * Third fallback: noembed works well for common content providers
 */
async function fetchFromNoembed(url: string): Promise<LinkMetadata | null> {
  try {
    const noembedUrl = new URL("https://noembed.com/embed");
    noembedUrl.searchParams.set("url", url);

    const response = await fetchWithTimeout(noembedUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.error) {
      return null;
    }

    const title = data.title || data.author_name || data.provider_name || null;
    const description = data.provider_name || null;
    const image = data.thumbnail_url || null;

    if (!title && !description && !image) {
      return null;
    }

    return {
      title,
      description,
      image,
      favicon: null,
      loading: false,
      error: null,
      source: "noembed",
    };
  } catch (err) {
    console.debug("Noembed error:", err);
    return null;
  }
}

/**
 * Hook to fetch metadata from a URL
 * Uses Microlink API as primary, with OtherMeta and noembed as fallbacks
 */
export function useMetadata() {
  const [metadata, setMetadata] = useState<LinkMetadata>({
    title: null,
    description: null,
    image: null,
    favicon: null,
    loading: false,
    error: null,
    source: null,
  });

  const fetchMetadata = useCallback(async (url: string): Promise<LinkMetadata> => {
    if (!url || !url.trim()) {
      setMetadata({
        title: null,
        description: null,
        image: null,
        favicon: null,
        loading: false,
        error: null,
        source: null,
      });
      return {
        title: null,
        description: null,
        image: null,
        favicon: null,
        loading: false,
        error: null,
        source: null,
      };
    }

    // Check cache first
    const cacheKey = normalizeUrl(url);
    const cached = metadataCache.get(cacheKey);
    if (cached) {
      setMetadata(cached);
      return cached;
    }

    setMetadata((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Normalize URL - ensure it has a protocol
      let normalizedUrl = url.trim();
      
      // Check if URL is valid
      try {
        new URL(normalizedUrl);
      } catch {
        // If invalid, try adding https://
        if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
          normalizedUrl = "https://" + normalizedUrl;
        }
      }

      // Validate one more time
      new URL(normalizedUrl);

      // Try primary API - Microlink
      let result = await fetchFromMicrolink(normalizedUrl);

      // If failed, try fallback - OtherMeta
      if (!result) {
        result = await fetchFromOtherMeta(normalizedUrl);
      }

      // Third fallback for common providers (YouTube, Vimeo, etc.)
      if (!result) {
        result = await fetchFromNoembed(normalizedUrl);
      }

      // If still no result, derive a basic local fallback from URL
      if (!result) {
        result = buildLocalFallback(normalizedUrl);
      }

      // Update cache
      metadataCache.set(cacheKey, result);

      setMetadata(result);
      return result;
    } catch (err) {
      const result: LinkMetadata = {
        title: null,
        description: null,
        image: null,
        favicon: null,
        loading: false,
        error: null, // Don't show error to user, just silently fail
        source: null,
      };
      
      // Still cache the result
      metadataCache.set(cacheKey, result);
      
      setMetadata(result);
      return result;
    }
  }, []);

  return { metadata, fetchMetadata };
}
