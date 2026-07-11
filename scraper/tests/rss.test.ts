import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseFeed } from "../src/rss.js";

const xml = await readFile(new URL("./fixtures/sample-feed.xml", import.meta.url), "utf8");
const NOW = new Date("2026-07-11T02:00:00.000Z");

describe("parseFeed", () => {
  it("maps items to Articles and skips items without a link", async () => {
    const articles = await parseFeed(xml, "example", NOW);
    expect(articles).toHaveLength(2); // third item has no link
    expect(articles[0]).toEqual({
      id: articles[0].id,
      title: "Scaling our data platform",
      url: "https://engineering.example.com/2026/07/scaling-data-platform",
      source: "example",
      publishedAt: "2026-07-08T12:00:00.000Z",
      tags: ["data", "infra"],
      summary: "How we scaled our data platform to petabytes.",
      thumbnail: "https://engineering.example.com/img/cover.png",
      fetchedAt: "2026-07-11T02:00:00.000Z",
    });
    expect(articles[0].id).toMatch(/^[0-9a-f]{40}$/);
  });

  it("defaults tags to empty and thumbnail to null", async () => {
    const articles = await parseFeed(xml, "example", NOW);
    expect(articles[1].tags).toEqual([]);
    expect(articles[1].thumbnail).toBeNull();
    expect(articles[1].summary).toBe("Plain text description.");
  });
});
