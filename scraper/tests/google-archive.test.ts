import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseGoogleArchivePage } from "../sources/google.js";
import { articleErrors } from "../src/validate.js";

const html = await readFile(new URL("./fixtures/google-archive.html", import.meta.url), "utf8");

describe("parseGoogleArchivePage", () => {
  const page = parseGoogleArchivePage(html, "https://developers.googleblog.com/search/");

  it("extracts a full page of posts", () => {
    expect(page.articles.length).toBeGreaterThanOrEqual(5);
  });

  it("every extracted article passes validation", () => {
    for (const article of page.articles) {
      expect(articleErrors(article)).toEqual([]);
      expect(new URL(article.url).host).toBe("developers.googleblog.com");
      expect(article.source).toBe("google");
    }
  });

  it("finds the next page link", () => {
    expect(page.nextUrl).toMatch(/developers\.googleblog\.com\/search\/\?page=\d+/);
  });
});
