import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseShopifyArchivePage } from "../sources/shopify.js";
import { articleErrors } from "../src/validate.js";

const html = await readFile(new URL("./fixtures/shopify-archive.html", import.meta.url), "utf8");

describe("parseShopifyArchivePage", () => {
  const page = parseShopifyArchivePage(html, "https://shopify.engineering/latest?page=2");

  it("extracts a full page of posts", () => {
    expect(page.articles.length).toBeGreaterThanOrEqual(5);
  });

  it("every extracted article passes validation", () => {
    for (const article of page.articles) {
      expect(articleErrors(article)).toEqual([]);
      expect(new URL(article.url).host).toBe("shopify.engineering");
      expect(article.source).toBe("shopify");
    }
  });

  it("finds the next page link (or null on the last page)", () => {
    expect(page.nextUrl === null || page.nextUrl.includes("?page=")).toBe(true);
  });
});
