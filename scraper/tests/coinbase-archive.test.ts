import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseCoinbaseArchivePage } from "../sources/coinbase.js";
import { articleErrors } from "../src/validate.js";

const html = await readFile(new URL("./fixtures/coinbase-archive.html", import.meta.url), "utf8");

describe("parseCoinbaseArchivePage", () => {
  const page = parseCoinbaseArchivePage(html, "https://www.coinbase.com/blog/landing/engineering");

  it("extracts articles from the embedded server-app-state JSON", () => {
    expect(page.articles.length).toBeGreaterThan(0);
  });

  it("every extracted article passes validation", () => {
    for (const article of page.articles) {
      expect(articleErrors(article)).toEqual([]);
      expect(new URL(article.url).host).toBe("www.coinbase.com");
      expect(article.source).toBe("coinbase");
    }
  });

  it("has no further pages (single reachable listing)", () => {
    expect(page.nextUrl).toBeNull();
  });
});
