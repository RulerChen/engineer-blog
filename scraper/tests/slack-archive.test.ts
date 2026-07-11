import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseSlackArchivePage } from "../sources/slack.js";
import { articleErrors } from "../src/validate.js";

const html = await readFile(new URL("./fixtures/slack-archive.html", import.meta.url), "utf8");

describe("parseSlackArchivePage", () => {
  const page = parseSlackArchivePage(html, "https://slack.engineering/articles/page/2/");

  it("extracts a full page of posts", () => {
    expect(page.articles.length).toBeGreaterThanOrEqual(5);
  });

  it("every extracted article passes validation", () => {
    for (const article of page.articles) {
      expect(articleErrors(article)).toEqual([]);
      expect(new URL(article.url).host).toBe("slack.engineering");
      expect(article.source).toBe("slack");
    }
  });

  it("finds the next page link (or null on the last page)", () => {
    expect(page.nextUrl === null || page.nextUrl.includes("slack.engineering")).toBe(true);
  });
});
