import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseAwsNewsArchivePage } from "../sources/aws-news.js";
import { articleErrors } from "../src/validate.js";

const html = await readFile(new URL("./fixtures/aws-news-archive.html", import.meta.url), "utf8");

describe("parseAwsNewsArchivePage", () => {
  const page = parseAwsNewsArchivePage(html, "https://aws.amazon.com/blogs/aws/page/2/");

  it("extracts a full page of posts", () => {
    expect(page.articles.length).toBeGreaterThanOrEqual(5);
  });

  it("every extracted article passes validation", () => {
    for (const article of page.articles) {
      expect(articleErrors(article)).toEqual([]);
      expect(new URL(article.url).host).toBe("aws.amazon.com");
      expect(article.source).toBe("aws-news");
    }
  });

  it("finds the next page link (or null on the last page)", () => {
    expect(page.nextUrl === null || page.nextUrl.includes("aws.amazon.com")).toBe(true);
  });
});
