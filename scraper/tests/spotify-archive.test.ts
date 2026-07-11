import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseSpotifyArchivePage } from "../sources/spotify.js";
import { articleErrors } from "../src/validate.js";

const html = await readFile(new URL("./fixtures/spotify-archive.html", import.meta.url), "utf8");

describe("parseSpotifyArchivePage", () => {
  const page = parseSpotifyArchivePage(html, "https://engineering.atspotify.com/");

  it("extracts a full page of posts", () => {
    expect(page.articles.length).toBeGreaterThanOrEqual(5);
  });

  it("every extracted article passes validation", () => {
    for (const article of page.articles) {
      expect(articleErrors(article)).toEqual([]);
      expect(new URL(article.url).host).toBe("engineering.atspotify.com");
      expect(article.source).toBe("spotify");
    }
  });

  it("has no next page (homepage is a single-page snapshot)", () => {
    expect(page.nextUrl).toBeNull();
  });
});
