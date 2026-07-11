import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseGithubArchivePage } from "../sources/github.js";
import { articleErrors } from "../src/validate.js";

const html = await readFile(new URL("./fixtures/github-archive.html", import.meta.url), "utf8");

describe("parseGithubArchivePage", () => {
  const page = parseGithubArchivePage(html, "https://github.blog/engineering/page/2/");

  it("extracts a full page of posts", () => {
    expect(page.articles.length).toBeGreaterThanOrEqual(5);
  });

  it("every extracted article passes validation", () => {
    for (const article of page.articles) {
      expect(articleErrors(article)).toEqual([]);
      expect(new URL(article.url).host).toBe("github.blog");
      expect(article.source).toBe("github");
    }
  });

  it("finds the next page link (or null on the last page)", () => {
    expect(page.nextUrl === null || page.nextUrl.includes("github.blog")).toBe(true);
  });
});
