import { describe, it, expect } from "vitest";
import { filterAndSortLinks } from "@/lib/utils";
import type { LinkItem, SearchFilters } from "@/types/link";

// Helper to create a link with defaults
function makeLink(overrides: Partial<LinkItem> = {}): LinkItem {
  return {
    id: "1",
    url: "https://example.com",
    title: "Example",
    description: "A test link",
    category: "General",
    tags: [],
    isFavorite: false,
    favicon: "",
    ogImage: "",
    notes: "",
    status: "backlog",
    priority: "medium",
    dueDate: null,
    createdAt: "2025-01-15T12:00:00Z",
    position: 0,
    ...overrides,
  };
}

const defaultFilters: SearchFilters = {
  query: "",
  category: null,
  tags: [],
  period: "all",
  sort: "newest",
  favoritesOnly: false,
  status: "all",
  priority: "all",
  dueDate: "all",
};

describe("filterAndSortLinks", () => {
  const links: LinkItem[] = [
    makeLink({ id: "1", title: "Alpha", url: "https://alpha.com", category: "Dev", tags: ["react", "js"], isFavorite: true, createdAt: "2025-01-10T00:00:00Z", position: 2 }),
    makeLink({ id: "2", title: "Beta", url: "https://beta.com", category: "Design", tags: ["css"], isFavorite: false, createdAt: "2025-01-15T00:00:00Z", position: 1 }),
    makeLink({ id: "3", title: "Gamma", url: "https://gamma.com", category: "Dev", tags: ["react", "ts"], isFavorite: true, createdAt: "2025-01-20T00:00:00Z", position: 0 }),
  ];

  it("returns all links with no filters", () => {
    const result = filterAndSortLinks(links, defaultFilters);
    expect(result).toHaveLength(3);
  });

  it("filters by text query (title)", () => {
    const result = filterAndSortLinks(links, { ...defaultFilters, query: "alpha" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters by text query (tag)", () => {
    const result = filterAndSortLinks(links, { ...defaultFilters, query: "css" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("filters by category", () => {
    const result = filterAndSortLinks(links, { ...defaultFilters, category: "Dev" });
    expect(result).toHaveLength(2);
  });

  it("filters by tags (all must match)", () => {
    const result = filterAndSortLinks(links, { ...defaultFilters, tags: ["react", "ts"] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  it("filters favorites only", () => {
    const result = filterAndSortLinks(links, { ...defaultFilters, favoritesOnly: true });
    expect(result).toHaveLength(2);
    expect(result.every((l) => l.isFavorite)).toBe(true);
  });

  it("sorts by newest", () => {
    const result = filterAndSortLinks(links, { ...defaultFilters, sort: "newest" });
    expect(result[0].id).toBe("3");
    expect(result[2].id).toBe("1");
  });

  it("sorts by oldest", () => {
    const result = filterAndSortLinks(links, { ...defaultFilters, sort: "oldest" });
    expect(result[0].id).toBe("1");
    expect(result[2].id).toBe("3");
  });

  it("sorts alphabetically", () => {
    const result = filterAndSortLinks(links, { ...defaultFilters, sort: "alphabetical" });
    expect(result.map((l) => l.title)).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("sorts by manual (position)", () => {
    const result = filterAndSortLinks(links, { ...defaultFilters, sort: "manual" });
    expect(result[0].id).toBe("3"); // position 0
    expect(result[1].id).toBe("2"); // position 1
    expect(result[2].id).toBe("1"); // position 2
  });

  it("sorts favorites first", () => {
    const result = filterAndSortLinks(links, { ...defaultFilters, sort: "favorites" });
    expect(result[0].isFavorite).toBe(true);
    expect(result[1].isFavorite).toBe(true);
    expect(result[2].isFavorite).toBe(false);
  });

  it("combines filters", () => {
    const result = filterAndSortLinks(links, {
      ...defaultFilters,
      category: "Dev",
      favoritesOnly: true,
      sort: "oldest",
    });
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("1");
  });

  it("returns empty array when nothing matches", () => {
    const result = filterAndSortLinks(links, { ...defaultFilters, query: "nonexistent" });
    expect(result).toHaveLength(0);
  });
});
