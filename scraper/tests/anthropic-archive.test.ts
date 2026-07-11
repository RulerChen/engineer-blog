import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseAnthropicArchivePage } from "../sources/anthropic.js";
import { articleErrors } from "../src/validate.js";

const html = await readFile(new URL("./fixtures/anthropic-archive.html", import.meta.url), "utf8");

describe("parseAnthropicArchivePage", () => {
  const page = parseAnthropicArchivePage(html, "https://www.anthropic.com/news");

  it("extracts the full embedded post archive", () => {
    expect(page.articles.length).toBeGreaterThanOrEqual(200);
  });

  it("every extracted article passes validation", () => {
    for (const article of page.articles) {
      expect(articleErrors(article)).toEqual([]);
      expect(new URL(article.url).host).toBe("www.anthropic.com");
      expect(article.source).toBe("anthropic");
    }
  });

  it("has no duplicate articles (deduped by URL)", () => {
    const urls = page.articles.map((article) => article.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("reaches back to the newsroom's oldest known post (2021)", () => {
    const oldest = page.articles.reduce((min, a) => (a.publishedAt < min.publishedAt ? a : min));
    expect(new Date(oldest.publishedAt).getUTCFullYear()).toBeLessThanOrEqual(2021);
  });

  it("has no next page (the whole archive is embedded in one response)", () => {
    expect(page.nextUrl).toBeNull();
  });
});
