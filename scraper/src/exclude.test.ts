import { describe, expect, it } from "vitest";
import { excludedIds, filterExcluded } from "./exclude.js";
import { articleId } from "./normalize.js";
import type { Article } from "./types.js";

function makeArticle(id: string, url: string): Article {
  return {
    id,
    title: id,
    url,
    source: "test",
    publishedAt: "2026-07-01T00:00:00.000Z",
    tags: [],
    summary: "",
    fetchedAt: "2026-07-01T00:00:00.000Z",
  };
}

describe("excludedIds", () => {
  it("resolves explicit ids directly", () => {
    expect(excludedIds([{ id: "abc123" }])).toEqual(new Set(["abc123"]));
  });

  it("resolves urls via the same hash as articleId", () => {
    const url = "https://example.com/some-post";
    expect(excludedIds([{ url }])).toEqual(new Set([articleId(url)]));
  });

  it("skips malformed urls instead of throwing", () => {
    expect(excludedIds([{ url: "not-a-url" }, { id: "keep-me" }])).toEqual(new Set(["keep-me"]));
  });
});

describe("filterExcluded", () => {
  it("drops articles whose id is in the excluded set", () => {
    const a = makeArticle("a", "https://example.com/a");
    const b = makeArticle("b", "https://example.com/b");
    expect(filterExcluded([a, b], new Set(["a"]))).toEqual([b]);
  });

  it("is a no-op with an empty excluded set", () => {
    const a = makeArticle("a", "https://example.com/a");
    expect(filterExcluded([a], new Set())).toEqual([a]);
  });
});
