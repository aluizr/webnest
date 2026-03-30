import { useState, useCallback, useEffect } from "react";

const NOTION_TOKEN_KEY = "webnest_notion_api_token";
const NOTION_API_VERSION = "2022-06-28";

interface NotionPageMetadata {
  title: string | null;
  description: string | null;
  coverImage: string | null;
  icon: string | null;
}

/**
 * Extract 32-character Notion page ID from various URL formats
 */
function extractNotionPageId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("notion")) return null;

    // Format: notion.com/username/Page-Title-abc123def456
    // Format: notion.com/abc123def456
    const pathMatch = parsed.pathname.match(/([a-f0-9]{32})/i);
    if (pathMatch) return pathMatch[1];

    // Format with dashes: abc123-def456-...
    const dashedMatch = parsed.pathname.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    if (dashedMatch) return dashedMatch[1].replace(/-/g, "");

    return null;
  } catch {
    return null;
  }
}

/**
 * Hook to manage Notion API integration
 */
export function useNotionApi() {
  const [token, setToken] = useState<string>("");
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(NOTION_TOKEN_KEY);
    if (stored) {
      setToken(stored);
      setIsConfigured(true);
    }
  }, []);

  const saveToken = useCallback((newToken: string) => {
    const trimmed = newToken.trim();
    if (trimmed) {
      localStorage.setItem(NOTION_TOKEN_KEY, trimmed);
      setToken(trimmed);
      setIsConfigured(true);
    } else {
      localStorage.removeItem(NOTION_TOKEN_KEY);
      setToken("");
      setIsConfigured(false);
    }
  }, []);

  const clearToken = useCallback(() => {
    localStorage.removeItem(NOTION_TOKEN_KEY);
    setToken("");
    setIsConfigured(false);
  }, []);

  const fetchPageMetadata = useCallback(async (url: string): Promise<NotionPageMetadata | null> => {
    if (!isConfigured) return null;

    const pageId = extractNotionPageId(url);
    if (!pageId) return null;

    try {
      const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Notion-Version": NOTION_API_VERSION,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.debug("Notion API error:", response.status, response.statusText);
        return null;
      }

      const data = await response.json();

      // Extract title from properties
      let title: string | null = null;
      if (data.properties) {
        const titleProp = Object.values(data.properties).find((prop: any) => prop.type === "title") as any;
        if (titleProp?.title?.[0]?.plain_text) {
          title = titleProp.title[0].plain_text;
        }
      }

      // Extract description (first 200 chars of content would require blocks API - skip for now)
      const description = null;

      // Extract cover image
      let coverImage: string | null = null;
      if (data.cover) {
        if (data.cover.type === "external") {
          coverImage = data.cover.external?.url || null;
        } else if (data.cover.type === "file") {
          coverImage = data.cover.file?.url || null;
        }
      }

      // Extract icon
      let icon: string | null = null;
      if (data.icon) {
        if (data.icon.type === "emoji") {
          icon = data.icon.emoji || null;
        } else if (data.icon.type === "external") {
          icon = data.icon.external?.url || null;
        } else if (data.icon.type === "file") {
          icon = data.icon.file?.url || null;
        }
      }

      return { title, description, coverImage, icon };
    } catch (err) {
      console.debug("Notion API fetch error:", err);
      return null;
    }
  }, [token, isConfigured]);

  return {
    token,
    isConfigured,
    saveToken,
    clearToken,
    fetchPageMetadata,
    extractNotionPageId,
  };
}
