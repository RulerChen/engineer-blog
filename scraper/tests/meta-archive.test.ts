import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseMetaArchivePage } from "../sources/meta.js";
import { articleErrors } from "../src/validate.js";

const html = await readFile(new URL("./fixtures/meta-archive.html", import.meta.url), "utf8");

describe("parseMetaArchivePage", () => {
  const page = parseMetaArchivePage(html, "https://engineering.fb.com/page/2/");

  it("extracts a full page of posts", () => {
    expect(page.articles.length).toBeGreaterThanOrEqual(5);
  });

  it("every extracted article passes validation", () => {
    for (const article of page.articles) {
      expect(articleErrors(article)).toEqual([]);
      expect(article.url.startsWith("https://engineering.fb.com/")).toBe(true);
      expect(article.source).toBe("meta");
    }
  });

  it("finds the next page link", () => {
    expect(page.nextUrl).toMatch(/engineering\.fb\.com\/page\/\d+/);
  });
});
