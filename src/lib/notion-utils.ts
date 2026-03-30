/**
 * Utility functions for Notion URL handling
 */

/**
 * Check if a URL is a Notion page URL
 */
export function isNotionUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes("notion");
  } catch {
    return false;
  }
}

/**
 * Extract 32-character Notion page ID from various URL formats
 * Supports:
 * - notion.com/username/Page-Title-abc123def456
 * - notion.com/abc123def456
 * - notion.com/abc123-def456-...
 */
export function extractNotionPageId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("notion")) return null;

    // Format: abc123def456 (32 hex chars)
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
