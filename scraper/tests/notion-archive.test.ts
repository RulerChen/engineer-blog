import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { extractNotionPublishedAt, parseNotionListingPage } from "../sources/notion.js";

const listingHtml = await readFile(
  new URL("./fixtures/notion-archive.html", import.meta.url),
  "utf8",
);
const postHtml = await readFile(new URL("./fixtures/notion-post.html", import.meta.url), "utf8");

describe("parseNotionListingPage", () => {
  const page = parseNotionListingPage(listingHtml, "https://www.notion.so/blog/topic/tech");

  it("extracts a full page of posts", () => {
    expect(page.articles.length).toBeGreaterThanOrEqual(5);
  });

  it("every extracted article has a title, url, and summary (no date yet)", () => {
    for (const article of page.articles) {
      expect(article.title.length).toBeGreaterThan(0);
      expect(new URL(article.url).host).toBe("www.notion.so");
      expect(article.source).toBe("notion");
      // the listing page carries no publish date — that's filled in later
      // by fetching each post's own page (see extractNotionPublishedAt below)
      expect(article.publishedAt).toBe("");
    }
  });

  it("finds the next page link (or null on the last page)", () => {
    expect(page.nextUrl === null || page.nextUrl.includes("/blog/topic/tech/page/")).toBe(true);
  });
});

describe("extractNotionPublishedAt", () => {
  it("reads datePublished from the post's Article JSON-LD block", () => {
    const publishedAt = extractNotionPublishedAt(postHtml);
    expect(publishedAt).not.toBe("");
    expect(Number.isNaN(Date.parse(publishedAt))).toBe(false);
  });

  it("returns an empty string when no Article JSON-LD is present", () => {
    expect(extractNotionPublishedAt("<html><body>no data here</body></html>")).toBe("");
  });
});
