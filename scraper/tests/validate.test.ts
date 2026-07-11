import { describe, expect, it } from "vitest";
import type { Article } from "../src/types.js";
import { articleErrors, filterValid } from "../src/validate.js";

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: "a".repeat(40),
    title: "A post",
    url: "https://example.com/post",
    source: "meta",
    publishedAt: "2026-07-01T00:00:00.000Z",
    tags: [],
    summary: "",
    thumbnail: null,
    fetchedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("articleErrors", () => {
  it("passes a valid article", () => {
    expect(articleErrors(makeArticle())).toEqual([]);
  });
  it("rejects an empty title", () => {
    expect(articleErrors(makeArticle({ title: "  " }))).toContain("empty title");
  });
  it("rejects a relative or garbage url", () => {
    expect(articleErrors(makeArticle({ url: "/relative/path" }))).toContain("invalid url");
  });
  it("rejects a non-http(s) url", () => {
    expect(articleErrors(makeArticle({ url: "ftp://a.com/x" }))).toContain("url not http(s)");
  });
  it("rejects an unparseable date", () => {
    expect(articleErrors(makeArticle({ publishedAt: "not a date" }))).toContain(
      "unparseable publishedAt",
    );
  });
});

describe("filterValid", () => {
  it("drops invalid entries and reports them", () => {
    const good = makeArticle();
    const bad = makeArticle({ title: "", url: "nope" });
    const dropped: string[][] = [];
    const result = filterValid([good, bad], (_a, errors) => dropped.push(errors));
    expect(result).toEqual([good]);
    expect(dropped).toHaveLength(1);
  });
});
