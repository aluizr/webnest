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
// Persiste no localStorage para sobreviver a reloads
class LRUCache<K, V> {
  private maxSize: number;
  private cache = new Map<K, { value: V; timestamp: number }>();
  private expiry: number;
  private storageKey: string;

  constructor(maxSize = 100, expiryMs = 24 * 60 * 60 * 1000, storageKey = "webnest:metadata_cache") {
    this.maxSize = maxSize;
    this.expiry = expiryMs;
    this.storageKey = storageKey;
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        const now = Date.now();
        // Carregar apenas entradas não expiradas
        for (const [key, entry] of Object.entries(data)) {
          const typedEntry = entry as { value: V; timestamp: number };
          if (now - typedEntry.timestamp < this.expiry) {
            this.cache.set(key as K, typedEntry);
          }
        }
        console.log(`[LRUCache] Carregadas ${this.cache.size} entradas do cache`);
      }
    } catch (err) {
      console.warn("[LRUCache] Erro ao carregar cache:", err);
    }
  }

  private saveToStorage(): void {
    try {
      const data: Record<string, { value: V; timestamp: number }> = {};
      for (const [key, entry] of this.cache.entries()) {
        data[key as string] = entry;
      }
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (err) {
      console.warn("[LRUCache] Erro ao salvar cache:", err);
    }
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > this.expiry) {
      this.cache.delete(key);
      this.saveToStorage();
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
    this.saveToStorage();
  }

  delete(key: K): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.saveToStorage();
    }
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
    
    // Imgix, Unsplash
    if (url.hostname.includes('imgix.net') || url.hostname === 'images.unsplash.com') {
      const original = new URL(imageUrl);
      original.search = '';
      return original.toString();
    }
    
    return imageUrl;
  } catch {
    return imageUrl;
  }
}

export function invalidateThumbnailCache(url: string) {
  let normalizedUrl = url.trim();
  try {
    const parsedUrl = new URL(normalizedUrl);
    normalizedUrl = parsedUrl.origin + parsedUrl.pathname + parsedUrl.search;
  } catch {
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = "https://" + normalizedUrl;
    }
  }
  metadataCache.delete(normalizedUrl);
  metadataCache.delete(url.trim());
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
 * Known fallback images for sites that block scraping or have broken OG images
 */
export const KNOWN_FALLBACKS: Record<string, string> = (() => {
  try {
    const stored = localStorage.getItem("webnest:known_fallbacks");
    if (stored) return JSON.parse(stored);
  } catch {}
  return {
    'claude.ai': 'https://claude.ai/images/claude_ogimage.png',
    'kaggle.com': 'https://www.kaggle.com/static/images/site-logo.svg',
    'joblib.readthedocs.io': 'https://joblib.readthedocs.io/en/stable/_static/joblib_logo.svg',
    'nanobananaimg.com': 'https://nanobananaimg.com/favicon.ico',
    'salesforce.com': 'https://www.salesforce.com/content/dam/sfdc-docs/www/logos/logo-salesforce.svg',
    'github.com': 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
    'linkedin.com': 'https://static.licdn.com/aero-v1/sc/h/al2o9zrvru7aqj8e1x2rzsrca',
    'twitter.com': 'https://abs.twimg.com/icons/apple-touch-icon-192x192.png',
    'x.com': 'https://abs.twimg.com/icons/apple-touch-icon-192x192.png',
    'youtube.com': 'https://www.youtube.com/img/desktop/yt_1200.png',
    'medium.com': 'https://miro.medium.com/v2/1*m-R_BkNf1Qjr1YbyOIJY2w.png',
  };
})();

/**
 * Known fallback favicons for sites with CORS-blocked favicons
 */
export const KNOWN_FAVICON_FALLBACKS: Record<string, string> = (() => {
  try {
    const stored = localStorage.getItem("webnest:known_favicon_fallbacks");
    if (stored) return JSON.parse(stored);
  } catch {}
  return {
    'claude.ai': 'https://claude.ai/images/claude_app_icon.png',
  };
})();

export function saveKnownFallbacks(fallbacks: Record<string, string>) {
  Object.assign(KNOWN_FALLBACKS, fallbacks);
  localStorage.setItem("webnest:known_fallbacks", JSON.stringify(KNOWN_FALLBACKS));
}

export function saveKnownFaviconFallbacks(fallbacks: Record<string, string>) {
  Object.assign(KNOWN_FAVICON_FALLBACKS, fallbacks);
  localStorage.setItem("webnest:known_favicon_fallbacks", JSON.stringify(KNOWN_FAVICON_FALLBACKS));
}

/**
 * Get fallback image for known problematic domains
 */
export function getKnownFallback(url: string): string | null {
  try {
    const hostname = new URL(url).hostname;
    
    // Check exact matches first
    if (KNOWN_FALLBACKS[hostname]) {
      return KNOWN_FALLBACKS[hostname];
    }
    
    // Check partial matches
    for (const [domain, fallback] of Object.entries(KNOWN_FALLBACKS)) {
      if (hostname.includes(domain)) {
        return fallback;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Get fallback favicon for known problematic domains
 */
export function getKnownFaviconFallback(url: string): string | null {
  try {
    const hostname = new URL(url).hostname;
    
    // Check exact matches first
    if (KNOWN_FAVICON_FALLBACKS[hostname]) {
      return KNOWN_FAVICON_FALLBACKS[hostname];
    }
    
    // Check partial matches
    for (const [domain, fallback] of Object.entries(KNOWN_FAVICON_FALLBACKS)) {
      if (hostname.includes(domain)) {
        return fallback;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Try to extract OG image directly from HTML when APIs fail
 * Uses server-side proxy to avoid CSP restrictions
 */
async function fetchOgImageFromHtml(url: string): Promise<string | null> {
  try {
    console.log("[fetchOgImageFromHtml] Fetching HTML via proxy from:", url);
    
    // Use server-side proxy to avoid CSP restrictions
    const proxyUrl = `/html-proxy?url=${encodeURIComponent(url)}`;
    const response = await fetchWithTimeout(proxyUrl);

    if (!response.ok) {
      console.log("[fetchOgImageFromHtml] Proxy response not OK:", response.status);
      return null;
    }

    const data = await response.json();
    console.log("[fetchOgImageFromHtml] Proxy returned:", data);
    
    if (data.ogImage) {
      console.log("[fetchOgImageFromHtml] Found OG image:", data.ogImage);
      
      // Validate that the image URL is absolute
      try {
        new URL(data.ogImage);
        return data.ogImage;
      } catch {
        // If relative URL, make it absolute
        try {
          const baseUrl = new URL(url);
          const absoluteUrl = new URL(data.ogImage, baseUrl.origin).href;
          console.log("[fetchOgImageFromHtml] Converted relative to absolute:", absoluteUrl);
          return absoluteUrl;
        } catch {
          console.log("[fetchOgImageFromHtml] Failed to convert relative URL");
          return null;
        }
      }
    }

    console.log("[fetchOgImageFromHtml] No OG image found in HTML");
    return null;
  } catch (err) {
    console.debug("[fetchOgImageFromHtml] Error:", err);
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
    
    // Se atingiu o limite (429), pular Microlink e ir direto para fallbacks
    if (response.status === 429) {
      console.warn("[fetchFromMicrolink] Rate limit atingido (429), usando fallbacks");
      // Salvar flag no localStorage para mostrar aviso
      localStorage.setItem("webnest:microlink_rate_limit", Date.now().toString());
      return null;
    }
    
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

    // Try to get OG image from original source
    let image = data.data.image?.url || null;
    console.log("[fetchFromMicrolink] Microlink image:", image);
    console.log("[fetchFromMicrolink] Microlink statusCode:", data.statusCode);
    
    // If no OG image, try known fallbacks for specific domains FIRST
    // This avoids unnecessary HTML fetches for sites we know are blocked
    if (!image) {
      const fallback = getKnownFallback(url);
      if (fallback) {
        console.log("[fetchFromMicrolink] Using known fallback:", fallback);
        image = fallback;
      }
    }
    
    // If still no image, try fetching directly from HTML
    // This works for sites that Microlink can't access but we can
    if (!image) {
      console.log("[fetchFromMicrolink] No OG image from Microlink, trying direct HTML fetch");
      image = await fetchOgImageFromHtml(url);
      console.log("[fetchFromMicrolink] HTML fetch result:", image);
    }
    
    // If still no image, use screenshot as last resort.
    // Guard: skip screenshot if the page title signals an error response
    // (e.g., "Error: 403", "Access Denied", "404 Not Found", "429 Too Many Requests").
    const screenshotUrl = data.data.screenshot?.url || null;
    const titleLower = (rawTitle || "").toLowerCase();
    const looksLikeErrorPage =
      /^error:/i.test(titleLower) ||
      /\b(403|404|429|500|502|503)\b/.test(titleLower) ||
      /(access denied|forbidden|not found|too many requests|rate limit|unauthorized)/i.test(titleLower);

    if (!image && screenshotUrl && !looksLikeErrorPage) {
      image = screenshotUrl;
      console.log("[fetchFromMicrolink] Using screenshot:", image);
    } else if (!image && screenshotUrl && looksLikeErrorPage) {
      console.log("[fetchFromMicrolink] Skipping screenshot — title suggests error page:", rawTitle);
    }
    
    // Extract original URL from proxy services to avoid CORS issues
    if (image) {
      const originalImage = image;
      image = extractOriginalImageUrl(image);
      if (originalImage !== image) {
        console.log("[fetchFromMicrolink] Extracted from proxy:", originalImage, "->", image);
      }
    }

    console.log("[fetchFromMicrolink] Final image:", image);

    // Get favicon with fallback for known problematic sites
    let favicon = data.data.logo?.url || null;
    if (!favicon) {
      const faviconFallback = getKnownFaviconFallback(url);
      if (faviconFallback) {
        console.log("[fetchFromMicrolink] Using known favicon fallback:", faviconFallback);
        favicon = faviconFallback;
      }
    }

    if (!title && !image && !data.data.description) return null;

    return {
      title,
      description: data.data.description || null,
      image,
      favicon,
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
