import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseDropboxArchivePage } from "../sources/dropbox.js";
import { articleErrors } from "../src/validate.js";

const html = await readFile(new URL("./fixtures/dropbox-archive.html", import.meta.url), "utf8");

describe("parseDropboxArchivePage", () => {
  const page = parseDropboxArchivePage(html, "https://dropbox.tech/all-stories");

  it("extracts a full page of posts", () => {
    expect(page.articles.length).toBeGreaterThanOrEqual(5);
  });

  it("every extracted article passes validation", () => {
    for (const article of page.articles) {
      expect(articleErrors(article)).toEqual([]);
      expect(new URL(article.url).host).toBe("dropbox.tech");
      expect(article.source).toBe("dropbox");
    }
  });

  it("finds the next page link (or null on the last page)", () => {
    expect(page.nextUrl === null || page.nextUrl.includes("dropbox.tech")).toBe(true);
  });
});
