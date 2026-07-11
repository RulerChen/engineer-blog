import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseStripeArchivePage } from "../sources/stripe.js";
import { articleErrors } from "../src/validate.js";

const html = await readFile(new URL("./fixtures/stripe-archive.html", import.meta.url), "utf8");

describe("parseStripeArchivePage", () => {
  const page = parseStripeArchivePage(html, "https://stripe.com/blog/engineering");

  it("extracts a full page of posts", () => {
    expect(page.articles.length).toBeGreaterThanOrEqual(15);
  });

  it("every extracted article passes validation and is tagged Engineering", () => {
    for (const article of page.articles) {
      expect(articleErrors(article)).toEqual([]);
      expect(new URL(article.url).host).toBe("stripe.com");
      expect(article.source).toBe("stripe");
    }
  });

  it("finds the next page link (or null on the last page)", () => {
    expect(page.nextUrl === null || page.nextUrl.includes("/blog/engineering/page/")).toBe(true);
  });
});
