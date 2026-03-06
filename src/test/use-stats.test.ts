import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useStats } from "@/hooks/use-stats";
import type { LinkItem } from "@/types/link";

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

describe("useStats", () => {
  const links: LinkItem[] = [
    makeLink({ id: "1", category: "Dev", tags: ["react", "js"], isFavorite: true, createdAt: "2025-01-10T00:00:00Z" }),
    makeLink({ id: "2", category: "Design", tags: ["css"], isFavorite: false, createdAt: "2025-01-15T00:00:00Z" }),
    makeLink({ id: "3", category: "Dev", tags: ["react", "ts"], isFavorite: true, createdAt: "2025-01-20T00:00:00Z" }),
    makeLink({ id: "4", category: "Dev", tags: ["js"], isFavorite: false, createdAt: "2025-01-20T00:00:00Z" }),
  ];

  describe("basicStats", () => {
    it("counts total links", () => {
      const { result } = renderHook(() => useStats(links));
      expect(result.current.basicStats.totalLinks).toBe(4);
    });

    it("counts favorites", () => {
      const { result } = renderHook(() => useStats(links));
      expect(result.current.basicStats.totalFavorites).toBe(2);
    });

    it("counts unique categories", () => {
      const { result } = renderHook(() => useStats(links));
      expect(result.current.basicStats.totalCategories).toBe(2);
    });

    it("counts unique tags", () => {
      const { result } = renderHook(() => useStats(links));
      // react, js, css, ts = 4 unique tags
      expect(result.current.basicStats.totalTags).toBe(4);
    });

    it("computes average links per category", () => {
      const { result } = renderHook(() => useStats(links));
      // 4 links / 2 categories = 2
      expect(result.current.basicStats.avgLinksPerCategory).toBe(2);
    });

    it("computes average tags per link", () => {
      const { result } = renderHook(() => useStats(links));
      // (2 + 1 + 2 + 1) = 6 tags / 4 links = 1.5
      expect(result.current.basicStats.avgTagsPerLink).toBe(1.5);
    });

    it("handles empty links array", () => {
      const { result } = renderHook(() => useStats([]));
      expect(result.current.basicStats.totalLinks).toBe(0);
      expect(result.current.basicStats.totalFavorites).toBe(0);
      expect(result.current.basicStats.totalCategories).toBe(0);
      expect(result.current.basicStats.avgLinksPerCategory).toBe(0);
      expect(result.current.basicStats.avgTagsPerLink).toBe(0);
    });
  });

  describe("categoryStats", () => {
    it("returns category distribution sorted by count desc", () => {
      const { result } = renderHook(() => useStats(links));
      expect(result.current.categoryStats).toHaveLength(2);
      expect(result.current.categoryStats[0]).toEqual({ name: "Dev", count: 3 });
      expect(result.current.categoryStats[1]).toEqual({ name: "Design", count: 1 });
    });

    it("returns empty for no links", () => {
      const { result } = renderHook(() => useStats([]));
      expect(result.current.categoryStats).toHaveLength(0);
    });
  });

  describe("tagStats", () => {
    it("returns tag distribution sorted by count desc", () => {
      const { result } = renderHook(() => useStats(links));
      const tags = result.current.tagStats;
      expect(tags[0].name).toBe("react"); // appears 2 times
      expect(tags[0].count).toBe(2);
      expect(tags[1].name).toBe("js"); // appears 2 times
      expect(tags[1].count).toBe(2);
    });

    it("limits to top 20 tags", () => {
      const manyTagLinks = Array.from({ length: 25 }, (_, i) =>
        makeLink({ id: String(i), tags: [`tag-${i}`] })
      );
      const { result } = renderHook(() => useStats(manyTagLinks));
      expect(result.current.tagStats.length).toBeLessThanOrEqual(20);
    });
  });

  describe("growthData", () => {
    it("groups links by date with cumulative count", () => {
      const { result } = renderHook(() => useStats(links));
      const growth = result.current.growthData;
      expect(growth.length).toBeGreaterThan(0);
      // Last entry cumulative should be total count
      expect(growth[growth.length - 1].cumulative).toBe(4);
    });

    it("dates are sorted chronologically", () => {
      const { result } = renderHook(() => useStats(links));
      const dates = result.current.growthData.map((d) => d.date);
      const sorted = [...dates].sort();
      expect(dates).toEqual(sorted);
    });
  });

  describe("timelineStats", () => {
    it("returns allTime count equal to total links", () => {
      const { result } = renderHook(() => useStats(links));
      expect(result.current.timelineStats.allTime).toBe(4);
    });

    it("returns 0 for today with old links", () => {
      const { result } = renderHook(() => useStats(links));
      expect(result.current.timelineStats.today).toBe(0);
    });
  });
});
