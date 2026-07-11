import { describe, expect, it } from "vitest";
import { mergeArticleFiles } from "../scripts/mergeArticles.js";
import type { Article } from "../src/types.js";

function makeArticle(id: string, publishedAt: string, source: string): Article {
  return {
    id,
    title: id,
    url: `https://example.com/${id}`,
    source,
    publishedAt,
    tags: [],
    summary: "",
    thumbnail: null,
    fetchedAt: publishedAt,
  };
}

describe("mergeArticleFiles", () => {
  it("flattens all sources and sorts newest-first", () => {
    const google = [makeArticle("g1", "2026-07-01T00:00:00.000Z", "google")];
    const meta = [
      makeArticle("m1", "2026-07-10T00:00:00.000Z", "meta"),
      makeArticle("m2", "2026-06-01T00:00:00.000Z", "meta"),
    ];
    expect(mergeArticleFiles([google, meta]).map((a) => a.id)).toEqual(["m1", "g1", "m2"]);
  });

  it("handles empty inputs", () => {
    expect(mergeArticleFiles([])).toEqual([]);
    expect(mergeArticleFiles([[], []])).toEqual([]);
  });
});
