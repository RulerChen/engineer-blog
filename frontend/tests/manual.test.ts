import { describe, expect, it } from "vitest";
import { articleId } from "../scripts/articleId.js";
import { toArticle } from "../scripts/manual.js";

describe("toArticle", () => {
  it("derives id from url and defaults source/tags/summary/thumbnail/fetchedAt", () => {
    const article = toArticle({
      title: "A manual post",
      url: "https://example.com/manual-post",
      publishedAt: "2026-07-10T00:00:00.000Z",
    });
    expect(article).toEqual({
      id: articleId("https://example.com/manual-post"),
      title: "A manual post",
      url: "https://example.com/manual-post",
      source: "manual",
      publishedAt: "2026-07-10T00:00:00.000Z",
      tags: [],
      summary: "",
      thumbnail: null,
      fetchedAt: "2026-07-10T00:00:00.000Z",
    });
  });

  it("honors explicit fields when provided", () => {
    const article = toArticle({
      title: "A manual post",
      url: "https://example.com/manual-post",
      source: "google",
      publishedAt: "2026-07-10T00:00:00.000Z",
      tags: ["backend"],
      summary: "a summary",
      thumbnail: "https://example.com/thumb.png",
      fetchedAt: "2026-07-12T00:00:00.000Z",
    });
    expect(article.source).toBe("google");
    expect(article.tags).toEqual(["backend"]);
    expect(article.summary).toBe("a summary");
    expect(article.thumbnail).toBe("https://example.com/thumb.png");
    expect(article.fetchedAt).toBe("2026-07-12T00:00:00.000Z");
  });
});
