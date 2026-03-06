import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDuplicateDetector } from "@/hooks/use-duplicate-detector";
import type { LinkItem } from "@/types/link";

function makeLink(overrides: Partial<LinkItem> = {}): LinkItem {
  return {
    id: "1",
    url: "https://example.com",
    title: "Example",
    description: "",
    category: "",
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

describe("useDuplicateDetector", () => {
  const links: LinkItem[] = [
    makeLink({ id: "1", url: "https://www.example.com/page" }),
    makeLink({ id: "2", url: "https://google.com" }),
    makeLink({ id: "3", url: "https://github.com/user/repo" }),
  ];

  it("returns not duplicate for empty URL", () => {
    const { result } = renderHook(() => useDuplicateDetector("", links));
    expect(result.current.isDuplicate).toBe(false);
  });

  it("detects exact URL duplicate", () => {
    const { result } = renderHook(() =>
      useDuplicateDetector("https://www.example.com/page", links)
    );
    expect(result.current.isDuplicate).toBe(true);
    expect(result.current.duplicateLink?.id).toBe("1");
  });

  it("detects duplicate ignoring www prefix", () => {
    const { result } = renderHook(() =>
      useDuplicateDetector("https://example.com/page", links)
    );
    expect(result.current.isDuplicate).toBe(true);
    expect(result.current.duplicateLink?.id).toBe("1");
  });

  it("detects duplicate ignoring protocol", () => {
    const { result } = renderHook(() =>
      useDuplicateDetector("http://google.com", links)
    );
    expect(result.current.isDuplicate).toBe(true);
    expect(result.current.duplicateLink?.id).toBe("2");
  });

  it("detects duplicate ignoring trailing slash", () => {
    const { result } = renderHook(() =>
      useDuplicateDetector("https://google.com/", links)
    );
    expect(result.current.isDuplicate).toBe(true);
    expect(result.current.duplicateLink?.id).toBe("2");
  });

  it("detects duplicate ignoring query params", () => {
    const { result } = renderHook(() =>
      useDuplicateDetector("https://google.com?utm_source=test", links)
    );
    expect(result.current.isDuplicate).toBe(true);
  });

  it("does not flag as duplicate when URL is different", () => {
    const { result } = renderHook(() =>
      useDuplicateDetector("https://new-site.com", links)
    );
    expect(result.current.isDuplicate).toBe(false);
  });

  it("ignores the link being edited", () => {
    const { result } = renderHook(() =>
      useDuplicateDetector("https://google.com", links, "2")
    );
    expect(result.current.isDuplicate).toBe(false);
  });

  it("still detects duplicates with other links when editing", () => {
    const { result } = renderHook(() =>
      useDuplicateDetector("https://google.com", links, "1")
    );
    expect(result.current.isDuplicate).toBe(true);
    expect(result.current.duplicateLink?.id).toBe("2");
  });
});
