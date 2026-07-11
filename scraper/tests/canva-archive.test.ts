import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseCanvaArchivePage } from "../sources/canva.js";
import { articleErrors } from "../src/validate.js";

const html = await readFile(new URL("./fixtures/canva-archive.html", import.meta.url), "utf8");

describe("parseCanvaArchivePage", () => {
  const page = parseCanvaArchivePage(html, "https://www.canva.dev/blog/engineering/");

  it("extracts the full embedded post archive", () => {
    expect(page.articles.length).toBeGreaterThanOrEqual(50);
  });

  it("every extracted article passes validation", () => {
    for (const article of page.articles) {
      expect(articleErrors(article)).toEqual([]);
      expect(new URL(article.url).host).toBe("www.canva.dev");
      expect(article.source).toBe("canva");
    }
  });

  it("reaches back to the blog's oldest known post (April 2015)", () => {
    const oldest = page.articles.reduce((min, a) => (a.publishedAt < min.publishedAt ? a : min));
    expect(new Date(oldest.publishedAt).getUTCFullYear()).toBeLessThanOrEqual(2015);
  });

  it("has no next page (the whole archive is embedded in one response)", () => {
    expect(page.nextUrl).toBeNull();
  });
});
