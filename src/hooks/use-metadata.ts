import { useState, useCallback } from "react";

export interface LinkMetadata {
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  loading: boolean;
  error: string | null;
}

// Simple cache for metadata requests
const metadataCache = new Map<string, LinkMetadata>();
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const cacheTimestamps = new Map<string, number>();

/**
 * Hook to fetch metadata from a URL
 * Uses Microlink API as fallback with CORS support
 */
export function useMetadata() {
  const [metadata, setMetadata] = useState<LinkMetadata>({
    title: null,
    description: null,
    image: null,
    favicon: null,
    loading: false,
    error: null,
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
      });
      return {
        title: null,
        description: null,
        image: null,
        favicon: null,
        loading: false,
        error: null,
      };
    }

    // Check cache first
    const cached = metadataCache.get(url);
    const cacheTime = cacheTimestamps.get(url);
    if (cached && cacheTime && Date.now() - cacheTime < CACHE_EXPIRY) {
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

      // Try Microlink API (CORS-friendly, no auth required)
      // Use proper URL encoding for the url parameter
      const microlinkUrl = new URL("https://api.microlink.io");
      microlinkUrl.searchParams.set("url", normalizedUrl);

      const response = await fetch(microlinkUrl.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.data) {
        throw new Error("No metadata found");
      }

      const result: LinkMetadata = {
        title: data.data.title || null,
        description: data.data.description || null,
        image: data.data.image?.url || null,
        favicon: data.data.logo?.url || null,
        loading: false,
        error: null,
      };

      // Update cache
      metadataCache.set(url, result);
      cacheTimestamps.set(url, Date.now());

      setMetadata(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : "Failed to fetch metadata";
      const result: LinkMetadata = {
        title: null,
        description: null,
        image: null,
        favicon: null,
        loading: false,
        error,
      };
      
      // Still cache the error for a shorter period (5 minutes)
      metadataCache.set(url, result);
      cacheTimestamps.set(url, Date.now());
      
      setMetadata(result);
      return result;
    }
  }, []);

  return { metadata, fetchMetadata };
}
