import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseInstagramArchivePage } from "../sources/instagram.js";
import { articleErrors } from "../src/validate.js";

const html = await readFile(new URL("./fixtures/instagram-archive.html", import.meta.url), "utf8");

describe("parseInstagramArchivePage", () => {
  const page = parseInstagramArchivePage(html, "https://engineering.fb.com/tag/instagram/page/2/");

  it("extracts a full page of posts", () => {
    expect(page.articles.length).toBeGreaterThanOrEqual(5);
  });

  it("every extracted article passes validation", () => {
    for (const article of page.articles) {
      expect(articleErrors(article)).toEqual([]);
      expect(article.url.startsWith("https://engineering.fb.com/")).toBe(true);
      expect(article.source).toBe("instagram");
    }
  });

  it("finds no next page link on the final page", () => {
    expect(page.nextUrl).toBeNull();
  });
});
