import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseUberArchivePage } from "../sources/uber.js";
import { articleErrors } from "../src/validate.js";

const html = await readFile(new URL("./fixtures/uber-archive.html", import.meta.url), "utf8");

describe("parseUberArchivePage", () => {
  const page = parseUberArchivePage(html, "https://eng.uber.com/");

  it("extracts a full page of posts", () => {
    expect(page.articles.length).toBeGreaterThanOrEqual(5);
  });

  it("every extracted article passes validation", () => {
    for (const article of page.articles) {
      expect(articleErrors(article)).toEqual([]);
      expect(new URL(article.url).host).toBe("www.uber.com");
      expect(article.source).toBe("uber");
    }
  });

  it("finds the next page link (or null on the last page)", () => {
    expect(page.nextUrl === null || page.nextUrl.includes("uber.com")).toBe(true);
  });
});
