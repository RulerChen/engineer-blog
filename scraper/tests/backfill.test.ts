import { describe, expect, it } from "vitest";
import { crawlArchive } from "../src/backfill.js";
import type { Article } from "../src/types.js";

function makeArticle(id: string): Article {
  return {
    id,
    title: id,
    url: `https://example.com/${id}`,
    source: "s1",
    publishedAt: "2026-07-01T00:00:00.000Z",
    tags: [],
    summary: "",
    thumbnail: null,
    fetchedAt: "2026-07-01T00:00:00.000Z",
  };
}

function fakeFetch(pages: Record<string, string>): typeof fetch {
  return (async (url: RequestInfo | URL) =>
    new Response(pages[String(url)] ?? "", {
      status: pages[String(url)] ? 200 : 404,
    })) as typeof fetch;
}

describe("crawlArchive", () => {
  it("follows nextUrl across pages and concatenates articles", async () => {
    const requested: string[] = [];
    const fetchImpl: typeof fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
      requested.push(String(url));
      expect(new Headers(init?.headers).get("user-agent")).toContain("engineer-blog-aggregator");
      return new Response(String(url), { status: 200 });
    }) as typeof fetch;
    const articles = await crawlArchive(
      "https://a.com/page/1",
      (html, pageUrl) => ({
        articles: [makeArticle(pageUrl)],
        nextUrl: pageUrl.endsWith("/1") ? "https://a.com/page/2" : null,
      }),
      { delayMs: 0, fetchImpl },
    );
    expect(requested).toEqual(["https://a.com/page/1", "https://a.com/page/2"]);
    expect(articles).toHaveLength(2);
  });

  it("stops at maxPages even if nextUrl keeps going", async () => {
    const articles = await crawlArchive(
      "https://a.com/page/1",
      (_html, pageUrl) => ({ articles: [makeArticle(pageUrl)], nextUrl: pageUrl }),
      { delayMs: 0, maxPages: 3, fetchImpl: fakeFetch({ "https://a.com/page/1": "x" }) },
    );
    expect(articles).toHaveLength(3);
  });

  it("throws on a non-200 response", async () => {
    await expect(
      crawlArchive("https://a.com/missing", () => ({ articles: [], nextUrl: null }), {
        delayMs: 0,
        fetchImpl: fakeFetch({}),
      }),
    ).rejects.toThrow("404");
  });
});
