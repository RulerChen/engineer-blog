import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { extractDiscordPublishedAt, parseDiscordCategoryPage } from "../sources/discord.js";

const listingHtml = await readFile(
  new URL("./fixtures/discord-archive.html", import.meta.url),
  "utf8",
);
const postHtml = await readFile(new URL("./fixtures/discord-post.html", import.meta.url), "utf8");

describe("parseDiscordCategoryPage", () => {
  const page = parseDiscordCategoryPage(listingHtml, "https://discord.com/category/engineering");

  it("extracts a full page of posts", () => {
    expect(page.articles.length).toBeGreaterThanOrEqual(5);
  });

  it("every extracted article has a title, url, and source (no date yet)", () => {
    for (const article of page.articles) {
      expect(article.title.length).toBeGreaterThan(0);
      expect(new URL(article.url).host).toBe("discord.com");
      expect(article.source).toBe("discord");
      // the listing page carries no publish date — that's filled in later
      // by fetching each post's own page (see extractDiscordPublishedAt below)
      expect(article.publishedAt).toBe("");
    }
  });

  it("is a single, unpaginated listing", () => {
    expect(page.nextUrl).toBeNull();
  });
});

describe("extractDiscordPublishedAt", () => {
  it("reads datePublished from the post's BlogPosting JSON-LD block", () => {
    const publishedAt = extractDiscordPublishedAt(postHtml);
    expect(publishedAt).not.toBe("");
    expect(Number.isNaN(Date.parse(publishedAt))).toBe(false);
  });

  it("returns an empty string when no BlogPosting JSON-LD is present", () => {
    expect(extractDiscordPublishedAt("<html><body>no data here</body></html>")).toBe("");
  });
});
