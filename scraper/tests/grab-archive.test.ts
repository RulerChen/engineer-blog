import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseGrabArchivePage } from "../sources/grab.js";
import { articleErrors } from "../src/validate.js";

const html = await readFile(new URL("./fixtures/grab-archive.html", import.meta.url), "utf8");

describe("parseGrabArchivePage", () => {
  const page = parseGrabArchivePage(html, "https://engineering.grab.com/");

  it("extracts a large batch of posts (the whole archive is on one page)", () => {
    expect(page.articles.length).toBeGreaterThanOrEqual(5);
  });

  it("every extracted article passes validation", () => {
    for (const article of page.articles) {
      expect(articleErrors(article)).toEqual([]);
      expect(new URL(article.url).host).toBe("engineering.grab.com");
      expect(article.source).toBe("grab");
    }
  });

  it("is a single, unpaginated listing", () => {
    expect(page.nextUrl).toBeNull();
  });
});
