import { describe, expect, it } from "vitest";
import type { Article } from "../src/types.js";

describe("Article model", () => {
  it("accepts a fully populated article", () => {
    const article: Article = {
      id: "abc123",
      title: "Hello",
      url: "https://example.com/post",
      source: "meta",
      publishedAt: "2026-07-01T00:00:00.000Z",
      tags: ["infra"],
      summary: "A post.",
      thumbnail: null,
      fetchedAt: "2026-07-02T00:00:00.000Z",
    };
    expect(article.source).toBe("meta");
  });
});
