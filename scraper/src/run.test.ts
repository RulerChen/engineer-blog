import { describe, expect, it } from "vitest";
import { runSources } from "./run.js";
import type { Article, Source } from "./types.js";

function makeArticle(id: string): Article {
  return {
    id,
    title: id,
    url: `https://example.com/${id}`,
    source: "test",
    publishedAt: "2026-07-01T00:00:00.000Z",
    tags: [],
    summary: "",
    thumbnail: null,
    fetchedAt: "2026-07-01T00:00:00.000Z",
  };
}

describe("runSources exclusion handling", () => {
  it("drops excluded articles from both freshly fetched and previously stored data", async () => {
    const source: Source = {
      id: "test",
      name: "Test",
      fetch: async () => [makeArticle("keep"), makeArticle("excluded-new")],
    };
    const stored: Record<string, Article[]> = { test: [makeArticle("excluded-old")] };

    const results = await runSources(
      [source],
      "fetch",
      {
        read: async (id) => stored[id] ?? [],
        write: async (id, articles) => {
          stored[id] = articles;
        },
      },
      new Set(["excluded-new", "excluded-old"]),
    );

    expect(stored.test.map((a) => a.id)).toEqual(["keep"]);
    expect(results[0]).toMatchObject({ status: "ok", fetched: 1 });
  });
});
