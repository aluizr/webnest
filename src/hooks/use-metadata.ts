import { useState, useCallback } from "react";
import { fetchNotionPageMetadata } from "@/lib/notion-api";
import { isNotionUrl } from "@/lib/notion-utils";

export interface LinkMetadata {
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  loading: boolean;
  error: string | null;
  source: "notion" | "microlink" | "noembed" | "local" | null;
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
    // Remove trailing slash, lowercase host, strip hash (never sent to server)
    return u.origin.toLowerCase() + u.pathname.replace(/\/+$/, "") + u.search;
  } catch {
    return url.trim().toLowerCase();
  }
}

/**
 * Extract original image URL from proxy services (Next.js, Vercel, etc)
 * These proxies often have CORS restrictions, so we extract the original URL
 */
function extractOriginalImageUrl(imageUrl: string): string {
  if (!imageUrl) return imageUrl;
  
  try {
    const url = new URL(imageUrl);
    
    // Next.js Image Optimization: /_next/image?url=...
    if (url.pathname.includes('/_next/image')) {
      const originalUrl = url.searchParams.get('url');
      if (originalUrl) {
        // If it's a relative URL, make it absolute
        if (originalUrl.startsWith('http')) {
          return originalUrl;
        } else if (originalUrl.startsWith('/')) {
          return `${url.origin}${originalUrl}`;
        }
      }
    }
    
    // Vercel Image Optimization: similar pattern
    if (url.pathname.includes('/_vercel/image')) {
      const originalUrl = url.searchParams.get('url');
      if (originalUrl) {
        return originalUrl.startsWith('http') ? originalUrl : imageUrl;
      }
    }
    
    // Cloudflare Image Resizing: /cdn-cgi/image/...
    if (url.pathname.includes('/cdn-cgi/image/')) {
      const parts = url.pathname.split('/cdn-cgi/image/');
      if (parts[1]) {
        // Extract URL after parameters
        const afterParams = parts[1].split('/').slice(1).join('/');
        if (afterParams.startsWith('http')) {
          return afterParams;
        }
      }
    }
    
    return imageUrl;
  } catch {
    return imageUrl;
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
      favicon: `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=32`,
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
 * Try to fetch metadata from Notion API
 * This handles Notion pages when an API key is available
 */
async function fetchFromNotion(url: string): Promise<LinkMetadata | null> {
  // Try to get Notion API key from localStorage
  const notionApiKey = localStorage.getItem("webnest:notion_api_key");
  if (!notionApiKey) {
    console.debug("No Notion API key configured, skipping Notion fetch");
    return null;
  }

  // Only try Notion API for Notion URLs
  if (!isNotionUrl(url)) {
    return null;
  }

  try {
    const notionMetadata = await fetchNotionPageMetadata(url, notionApiKey);
    if (!notionMetadata) {
      return null;
    }

    // Extract original URLs from proxy services
    let image = notionMetadata.image;
    if (image) {
      image = extractOriginalImageUrl(image);
    }

    // If no custom favicon, use Notion's default favicon
    const favicon = notionMetadata.favicon || "https://www.notion.so/images/favicon.ico";

    return {
      ...notionMetadata,
      image,
      favicon,
      loading: false,
      error: null,
      source: "notion",
    };
  } catch (err) {
    console.debug("Notion API error:", err);
    return null;
  }
}

/**
 * Try to extract metadata using Microlink API with fallback
 */
async function fetchFromMicrolink(url: string): Promise<LinkMetadata | null> {
  try {
    const microlinkUrl = new URL("https://api.microlink.io");
    microlinkUrl.searchParams.set("url", url);
    microlinkUrl.searchParams.set("screenshot", "true");

    const response = await fetchWithTimeout(microlinkUrl.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (response.status === 400) return null;
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!data.data) return null;

    const rawTitle = data.data.title || null;
    const isErrorTitle = rawTitle && /^error:/i.test(rawTitle.trim());
    
    // If title is an error but we have a screenshot, try to derive title from URL
    let title = isErrorTitle ? null : rawTitle;
    if (!title && data.data.screenshot?.url) {
      try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace(/^www\./i, "");
        title = hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
      } catch {
        title = null;
      }
    }

    // Use screenshot as fallback when no OG image is available
    // Screenshot is useful for JS-rendered sites even if they return error status
    let image = data.data.image?.url || data.data.screenshot?.url || null;
    
    // Extract original URL from proxy services to avoid CORS issues
    if (image) {
      image = extractOriginalImageUrl(image);
    }

    if (!title && !image && !data.data.description) return null;

    return {
      title,
      description: data.data.description || null,
      image,
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
    let image = data.thumbnail_url || null;
    
    // Extract original URL from proxy services
    if (image) {
      image = extractOriginalImageUrl(image);
    }

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
 * Uses Microlink API as primary, with noembed and local derivation as fallbacks
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

    setMetadata((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Normalize URL - ensure it has a protocol
      let normalizedUrl = url.trim();
      
      // Check if URL is valid
      try {
        new URL(normalizedUrl);
      } catch {
        if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
          normalizedUrl = "https://" + normalizedUrl;
        }
      }

      // Strip hash and normalize — use this as both cache key and fetch URL
      const parsedUrl = new URL(normalizedUrl);
      normalizedUrl = parsedUrl.origin + parsedUrl.pathname + parsedUrl.search;

      // Check cache with the clean URL
      const cleanCacheKey = normalizedUrl;
      const cached = metadataCache.get(cleanCacheKey);
      if (cached) {
        setMetadata(cached);
        return cached;
      }

      // Try Notion API first for Notion URLs (if API key is configured)
      let result = await fetchFromNotion(normalizedUrl);

      // Try primary API - Microlink
      if (!result) {
        result = await fetchFromMicrolink(normalizedUrl);
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
      metadataCache.set(cleanCacheKey, result);

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
      
      // Still cache the result — use normalized URL if available, else raw
      metadataCache.set(url.trim(), result);
      
      setMetadata(result);
      return result;
    }
  }, []);

  return { metadata, fetchMetadata };
}
