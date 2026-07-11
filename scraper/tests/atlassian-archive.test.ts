import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { extractAtlassianPublishedAt, parseAtlassianListingPage } from "../sources/atlassian.js";

const listingHtml = await readFile(
  new URL("./fixtures/atlassian-archive.html", import.meta.url),
  "utf8",
);
const postHtml = await readFile(new URL("./fixtures/atlassian-post.html", import.meta.url), "utf8");

describe("parseAtlassianListingPage", () => {
  const page = parseAtlassianListingPage(
    listingHtml,
    "https://www.atlassian.com/blog/how-we-build",
  );

  it("extracts a full page of posts", () => {
    expect(page.articles.length).toBeGreaterThanOrEqual(5);
  });

  it("every extracted article has a title, url, and summary (no date yet)", () => {
    for (const article of page.articles) {
      expect(article.title.length).toBeGreaterThan(0);
      expect(new URL(article.url).host).toBe("www.atlassian.com");
      expect(article.source).toBe("atlassian");
      // the listing page carries no publish date — that's filled in later
      // by fetching each post's own page (see extractAtlassianPublishedAt below)
      expect(article.publishedAt).toBe("");
    }
  });

  it("finds the next page link (or null on the last page)", () => {
    expect(page.nextUrl === null || page.nextUrl.includes("/blog/how-we-build/page/")).toBe(true);
  });
});

describe("extractAtlassianPublishedAt", () => {
  it("reads datePublished from the post's Article JSON-LD block", () => {
    const publishedAt = extractAtlassianPublishedAt(postHtml);
    expect(publishedAt).not.toBe("");
    expect(Number.isNaN(Date.parse(publishedAt))).toBe(false);
  });

  it("returns an empty string when no Article JSON-LD is present", () => {
    expect(extractAtlassianPublishedAt("<html><body>no data here</body></html>")).toBe("");
  });
});
