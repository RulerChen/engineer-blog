import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseYelpArchivePage } from "../sources/yelp.js";
import { articleErrors } from "../src/validate.js";

const html = await readFile(new URL("./fixtures/yelp-archive.html", import.meta.url), "utf8");

describe("parseYelpArchivePage", () => {
  const page = parseYelpArchivePage(html, "https://engineeringblog.yelp.com/page/2/");

  it("extracts a full page of posts", () => {
    expect(page.articles.length).toBeGreaterThanOrEqual(5);
  });

  it("every extracted article passes validation", () => {
    for (const article of page.articles) {
      expect(articleErrors(article)).toEqual([]);
      expect(new URL(article.url).host).toBe("engineeringblog.yelp.com");
      expect(article.source).toBe("yelp");
    }
  });

  it("finds the next page link (or null on the last page)", () => {
    expect(page.nextUrl === null || page.nextUrl.includes("engineeringblog.yelp.com")).toBe(true);
  });
});
