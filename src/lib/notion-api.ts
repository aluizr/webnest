import { extractNotionPageId } from "./notion-utils";

const NOTION_TOKEN_KEY = "webnest:notion_api_key";
const NOTION_API_VERSION = "2022-06-28";

export interface NotionPageMetadata {
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
}

/**
 * Get stored Notion API token from localStorage
 */
export function getNotionToken(): string | null {
  return localStorage.getItem(NOTION_TOKEN_KEY);
}

/**
 * Fetch page metadata from Notion API
 * @param urlOrPageId - Full Notion URL or 32-char page ID
 * @param token - Optional Notion API token (uses localStorage if not provided)
 */
export async function fetchNotionPageMetadata(urlOrPageId: string, token?: string): Promise<NotionPageMetadata | null> {
  const apiToken = token || getNotionToken();
  if (!apiToken) return null;

  // Extract page ID if a URL was provided
  const pageId = urlOrPageId.length === 32 ? urlOrPageId : extractNotionPageId(urlOrPageId);
  if (!pageId) return null;

  try {
    const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Notion-Version": NOTION_API_VERSION,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.debug("Notion API error:", response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    // Extract title
    let title: string | null = null;
    if (data.properties) {
      const titleProp = Object.values(data.properties).find((prop: any) => prop.type === "title") as any;
      if (titleProp?.title?.[0]?.plain_text) {
        title = titleProp.title[0].plain_text;
      }
    }

    // Extract cover image
    let image: string | null = null;
    if (data.cover) {
      if (data.cover.type === "external") {
        image = data.cover.external?.url || null;
      } else if (data.cover.type === "file") {
        image = data.cover.file?.url || null;
      }
    }

    // Extract icon as favicon
    let favicon: string | null = null;
    if (data.icon) {
      if (data.icon.type === "external") {
        favicon = data.icon.external?.url || null;
      } else if (data.icon.type === "file") {
        favicon = data.icon.file?.url || null;
      }
    }

    return { title, description: null, image, favicon };
  } catch (err) {
    console.debug("Notion API fetch error:", err);
    return null;
  }
}
