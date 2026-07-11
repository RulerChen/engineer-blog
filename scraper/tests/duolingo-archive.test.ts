import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseDuolingoArchivePage } from "../sources/duolingo.js";
import { articleErrors } from "../src/validate.js";

const html = await readFile(new URL("./fixtures/duolingo-archive.html", import.meta.url), "utf8");

describe("parseDuolingoArchivePage", () => {
  const page = parseDuolingoArchivePage(html, "https://blog.duolingo.com/hub/engineering/");

  it("extracts the hero post plus the featured-card posts", () => {
    expect(page.articles.length).toBeGreaterThanOrEqual(4);
  });

  it("every extracted article passes validation", () => {
    for (const article of page.articles) {
      expect(articleErrors(article)).toEqual([]);
      expect(new URL(article.url).host).toBe("blog.duolingo.com");
      expect(article.source).toBe("duolingo");
      expect(article.tags).toContain("general");
    }
  });

  it("has no pagination on this single curated hub page", () => {
    expect(page.nextUrl).toBeNull();
  });
});
