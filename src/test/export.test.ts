import { describe, it, expect } from "vitest";
import { exportAsCSV } from "@/lib/export";
import type { LinkItem } from "@/types/link";

function makeLink(overrides: Partial<LinkItem> = {}): LinkItem {
  return {
    id: "1",
    url: "https://example.com",
    title: "Example",
    description: "A test link",
    category: "General",
    tags: ["tag1", "tag2"],
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

/** Read Blob content as text (jsdom compatible via FileReader) */
function blobToText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(blob);
  });
}

describe("exportAsCSV", () => {
  it("exports with correct headers", async () => {
    const blob = exportAsCSV([makeLink()]);
    const text = await blobToText(blob);
    const firstLine = text.split("\n")[0];
    expect(firstLine).toBe("Title,URL,Category,Tags,Favorite,Status,Priority,Due Date,Description,Notes,Created At");
  });

  it("exports link data in correct columns", async () => {
    const blob = exportAsCSV([makeLink({ title: "My Link", url: "https://test.com", category: "Dev" })]);
    const text = await blobToText(blob);
    const lines = text.split("\n");
    expect(lines[1]).toContain("My Link");
    expect(lines[1]).toContain("https://test.com");
    expect(lines[1]).toContain("Dev");
  });

  it("escapes commas in CSV values", async () => {
    const blob = exportAsCSV([makeLink({ title: "Hello, World" })]);
    const text = await blobToText(blob);
    expect(text).toContain('"Hello, World"');
  });

  it("escapes quotes in CSV values", async () => {
    const blob = exportAsCSV([makeLink({ title: 'Say "hi"' })]);
    const text = await blobToText(blob);
    expect(text).toContain('"Say ""hi"""');
  });

  it("marks favorites correctly", async () => {
    const blob = exportAsCSV([makeLink({ isFavorite: true }), makeLink({ id: "2", isFavorite: false })]);
    const text = await blobToText(blob);
    const lines = text.split("\n");
    expect(lines[1]).toContain("Yes");
    expect(lines[2]).toContain("No");
  });

  it("joins tags with semicolon", async () => {
    const blob = exportAsCSV([makeLink({ tags: ["react", "typescript"] })]);
    const text = await blobToText(blob);
    expect(text).toContain("react; typescript");
  });

  it("handles empty links array", async () => {
    const blob = exportAsCSV([]);
    const text = await blobToText(blob);
    const lines = text.split("\n").filter(Boolean);
    expect(lines).toHaveLength(1); // headers only
  });

  it("produces text/csv blob", () => {
    const blob = exportAsCSV([makeLink()]);
    expect(blob.type).toBe("text/csv;charset=utf-8;");
  });
});
