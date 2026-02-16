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
 * Try to extract metadata using Microlink API with fallback
 */
async function fetchFromMicrolink(url: string): Promise<LinkMetadata | null> {
  try {
    const microlinkUrl = new URL("https://api.microlink.io");
    microlinkUrl.searchParams.set("url", url);

    const response = await fetch(microlinkUrl.toString(), {
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

    const response = await fetch(otherMetaUrl.toString(), {
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
    };
  } catch (err) {
    console.debug("OtherMeta error:", err);
    return null;
  }
}

/**
 * Hook to fetch metadata from a URL
 * Uses Microlink API as primary, with OtherMeta as fallback
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

      // Try primary API - Microlink
      let result = await fetchFromMicrolink(normalizedUrl);

      // If failed, try fallback - OtherMeta
      if (!result) {
        result = await fetchFromOtherMeta(normalizedUrl);
      }

      // If still no result, create empty result (don't show error, just empty preview)
      if (!result) {
        result = {
          title: null,
          description: null,
          image: null,
          favicon: null,
          loading: false,
          error: null,
        };
      }

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
        error: null, // Don't show error to user, just silently fail
      };
      
      // Still cache the result
      metadataCache.set(url, result);
      cacheTimestamps.set(url, Date.now());
      
      setMetadata(result);
      return result;
    }
  }, []);

  return { metadata, fetchMetadata };
}
