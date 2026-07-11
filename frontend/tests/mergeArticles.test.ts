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

  it("includes manual articles alongside scraped ones", () => {
    const google = [makeArticle("g1", "2026-07-01T00:00:00.000Z", "google")];
    const manual = [makeArticle("man1", "2026-07-05T00:00:00.000Z", "manual")];
    expect(mergeArticleFiles([google], manual).map((a) => a.id)).toEqual(["man1", "g1"]);
  });

  it("lets scraped data win over a manual entry with the same id", () => {
    const scraped = makeArticle("shared", "2026-07-01T00:00:00.000Z", "google");
    scraped.title = "scraped title";
    const manual = makeArticle("shared", "2026-07-01T00:00:00.000Z", "manual");
    manual.title = "manual title";
    expect(mergeArticleFiles([[scraped]], [manual]).map((a) => a.title)).toEqual(["scraped title"]);
  });

  it("drops excluded articles", () => {
    const a = makeArticle("a", "2026-07-01T00:00:00.000Z", "google");
    const b = makeArticle("b", "2026-06-01T00:00:00.000Z", "google");
    expect(mergeArticleFiles([[a, b]], [], new Set(["a"])).map((x) => x.id)).toEqual(["b"]);
  });
});
