/**
 * Utility functions for handling image URLs with proxy
 */

/**
 * Ensures an image URL goes through the /og-proxy to bypass CORS restrictions
 * If the URL is already proxied, returns it as-is
 * If the URL is null/undefined, returns null
 */
export function ensureProxied(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  
  // Already proxied
  if (imageUrl.startsWith('/og-proxy')) {
    return imageUrl;
  }
  
  // External URL - needs proxy
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return `/og-proxy?url=${encodeURIComponent(imageUrl)}`;
  }
  
  // Relative URL or data URL - no proxy needed
  return imageUrl;
}

/**
 * Extracts the original URL from a proxied URL
 * If not proxied, returns the URL as-is
 */
export function extractFromProxy(proxiedUrl: string | null | undefined): string | null {
  if (!proxiedUrl) return null;
  
  if (proxiedUrl.startsWith('/og-proxy?url=')) {
    try {
      const url = new URL(proxiedUrl, 'http://localhost');
      const originalUrl = url.searchParams.get('url');
      return originalUrl || proxiedUrl;
    } catch {
      return proxiedUrl;
    }
  }
  
  return proxiedUrl;
}

/**
 * Checks if a URL is already proxied
 */
export function isProxied(url: string | null | undefined): boolean {
  return !!url && url.startsWith('/og-proxy');
}
