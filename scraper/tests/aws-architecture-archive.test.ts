import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseAwsArchitectureArchivePage } from "../sources/aws-architecture.js";
import { articleErrors } from "../src/validate.js";

const html = await readFile(
  new URL("./fixtures/aws-architecture-archive.html", import.meta.url),
  "utf8",
);

describe("parseAwsArchitectureArchivePage", () => {
  const page = parseAwsArchitectureArchivePage(
    html,
    "https://aws.amazon.com/blogs/architecture/page/2/",
  );

  it("extracts a full page of posts", () => {
    expect(page.articles.length).toBeGreaterThanOrEqual(5);
  });

  it("every extracted article passes validation", () => {
    for (const article of page.articles) {
      expect(articleErrors(article)).toEqual([]);
      expect(new URL(article.url).host).toBe("aws.amazon.com");
      expect(article.source).toBe("aws-architecture");
    }
  });

  it("finds the next page link (or null on the last page)", () => {
    expect(page.nextUrl === null || page.nextUrl.includes("aws.amazon.com")).toBe(true);
  });
});
