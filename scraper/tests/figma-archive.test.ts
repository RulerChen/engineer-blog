import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseFigmaArchivePage } from "../sources/figma.js";
import { articleErrors } from "../src/validate.js";

const html = await readFile(new URL("./fixtures/figma-archive.html", import.meta.url), "utf8");

describe("parseFigmaArchivePage", () => {
  const page = parseFigmaArchivePage(html, "https://www.figma.com/blog/engineering/");

  it("extracts a full page of posts", () => {
    expect(page.articles.length).toBeGreaterThanOrEqual(20);
  });

  it("every extracted article passes validation", () => {
    for (const article of page.articles) {
      expect(articleErrors(article)).toEqual([]);
      expect(new URL(article.url).host).toBe("www.figma.com");
      expect(article.source).toBe("figma");
    }
  });

  it("is a single curated listing with no next page", () => {
    expect(page.nextUrl).toBeNull();
  });
});
