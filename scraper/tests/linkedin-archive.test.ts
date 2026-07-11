import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseLinkedinArchivePage } from "../sources/linkedin.js";
import { articleErrors } from "../src/validate.js";

const html = await readFile(new URL("./fixtures/linkedin-archive.html", import.meta.url), "utf8");

describe("parseLinkedinArchivePage", () => {
  const page = parseLinkedinArchivePage(html, "https://engineering.linkedin.com/blog");

  it("extracts the grid of dated posts", () => {
    expect(page.articles.length).toBeGreaterThanOrEqual(5);
  });

  it("every extracted article passes validation", () => {
    for (const article of page.articles) {
      expect(articleErrors(article)).toEqual([]);
      expect(new URL(article.url).host).toBe("www.linkedin.com");
      expect(article.source).toBe("linkedin");
    }
  });

  it("has no next page (the listing isn't paginated)", () => {
    expect(page.nextUrl).toBeNull();
  });
});
