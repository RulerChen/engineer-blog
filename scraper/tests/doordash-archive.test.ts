import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseDoordashArchivePage } from "../sources/doordash.js";
import { articleErrors } from "../src/validate.js";

const json = await readFile(new URL("./fixtures/doordash-archive.json", import.meta.url), "utf8");
const pageUrl =
  "https://careersatdoordash.com/wp-json/wp/v2/posts?categories=8&per_page=20&page=1&_embed=wp%3Aterm%2Cwp%3Afeaturedmedia";

describe("parseDoordashArchivePage", () => {
  const page = parseDoordashArchivePage(json, pageUrl);

  it("extracts a full page of posts", () => {
    expect(page.articles.length).toBeGreaterThanOrEqual(5);
  });

  it("every extracted article passes validation", () => {
    for (const article of page.articles) {
      expect(articleErrors(article)).toEqual([]);
      expect(new URL(article.url).host).toBe("careersatdoordash.com");
      expect(article.source).toBe("doordash");
    }
  });

  it("finds the next page link when a full page is returned", () => {
    expect(page.nextUrl).not.toBeNull();
    expect(page.nextUrl).toContain("page=2");
  });

  it("returns no next page when fewer than a full page comes back", () => {
    const partial = JSON.parse(json).slice(0, 3);
    const partialPage = parseDoordashArchivePage(JSON.stringify(partial), pageUrl);
    expect(partialPage.nextUrl).toBeNull();
  });
});
