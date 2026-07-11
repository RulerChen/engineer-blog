import { describe, expect, it } from "vitest";
import { merge } from "../src/merge.js";
import type { Article } from "../src/types.js";

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: "id-1",
    title: "Original title",
    url: "https://example.com/post",
    source: "meta",
    publishedAt: "2026-07-01T00:00:00.000Z",
    tags: [],
    summary: "old summary",
    thumbnail: null,
    fetchedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("merge", () => {
  it("adds new articles to existing ones", () => {
    const existing = [makeArticle({ id: "id-1" })];
    const fetched = [makeArticle({ id: "id-2", url: "https://example.com/other" })];
    expect(merge(existing, fetched)).toHaveLength(2);
  });

  it("fresh data wins field-by-field on re-fetch", () => {
    const existing = [makeArticle({ title: "Old", tags: [], summary: "old" })];
    const fetched = [
      makeArticle({
        title: "Fixed title",
        tags: ["ml"],
        summary: "updated",
        fetchedAt: "2026-07-11T00:00:00.000Z",
      }),
    ];
    const [merged] = merge(existing, fetched);
    expect(merged.title).toBe("Fixed title");
    expect(merged.tags).toEqual(["ml"]);
    expect(merged.summary).toBe("updated");
  });

  it("always keeps the original first-seen fetchedAt", () => {
    const existing = [makeArticle({ fetchedAt: "2026-06-01T00:00:00.000Z" })];
    const fetched = [makeArticle({ fetchedAt: "2026-07-11T00:00:00.000Z" })];
    expect(merge(existing, fetched)[0].fetchedAt).toBe("2026-06-01T00:00:00.000Z");
  });

  it("sorts newest-first by publishedAt", () => {
    const existing = [makeArticle({ id: "old", publishedAt: "2025-01-01T00:00:00.000Z" })];
    const fetched = [
      makeArticle({ id: "new", publishedAt: "2026-07-10T00:00:00.000Z" }),
      makeArticle({ id: "mid", publishedAt: "2026-01-01T00:00:00.000Z" }),
    ];
    expect(merge(existing, fetched).map((a) => a.id)).toEqual(["new", "mid", "old"]);
  });

  it("returns existing untouched when fetched is empty", () => {
    const existing = [makeArticle()];
    expect(merge(existing, [])).toEqual(existing);
  });
});
