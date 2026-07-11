import { describe, expect, it } from "vitest";
import { applyFilters, companyCounts, emptyFilter, isNew, topTags } from "../src/lib/filter.js";
import type { Article } from "../src/types.js";

const NOW = new Date("2026-07-11T12:00:00.000Z");

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: Math.random().toString(36).slice(2),
    title: "Kubernetes at scale",
    url: "https://example.com/post",
    source: "google",
    publishedAt: "2026-07-10T00:00:00.000Z",
    tags: [],
    summary: "How we run clusters.",
    fetchedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("applyFilters — search", () => {
  it("matches title case-insensitively", () => {
    const articles = [makeArticle({ title: "GraphQL Deep Dive" }), makeArticle()];
    const state = { ...emptyFilter(), query: "graphql" };
    expect(applyFilters(articles, state, NOW)).toHaveLength(1);
  });
  it("matches summary text too", () => {
    const articles = [makeArticle({ summary: "Postgres tuning tips" }), makeArticle()];
    const state = { ...emptyFilter(), query: "POSTGRES" };
    expect(applyFilters(articles, state, NOW)).toHaveLength(1);
  });
  it("empty query matches everything", () => {
    expect(applyFilters([makeArticle(), makeArticle()], emptyFilter(), NOW)).toHaveLength(2);
  });
});

describe("applyFilters — companies and tags", () => {
  const articles = [
    makeArticle({ source: "google", tags: ["ml"] }),
    makeArticle({ source: "meta", tags: ["ml", "infra"] }),
    makeArticle({ source: "uber", tags: [] }),
  ];
  it("filters by company multi-select (OR within the facet)", () => {
    const state = { ...emptyFilter(), companies: ["google", "meta"] };
    expect(applyFilters(articles, state, NOW)).toHaveLength(2);
  });
  it("filters by tag multi-select (article needs any selected tag)", () => {
    const state = { ...emptyFilter(), tags: ["infra"] };
    expect(applyFilters(articles, state, NOW)).toHaveLength(1);
  });
  it("combines facets with AND", () => {
    const state = { ...emptyFilter(), companies: ["google"], tags: ["infra"] };
    expect(applyFilters(articles, state, NOW)).toHaveLength(0);
  });
});

describe("applyFilters — date presets", () => {
  const articles = [
    makeArticle({ publishedAt: "2026-07-09T00:00:00.000Z" }), // 2 days ago
    makeArticle({ publishedAt: "2026-06-20T00:00:00.000Z" }), // 3 weeks ago
    makeArticle({ publishedAt: "2025-09-01T00:00:00.000Z" }), // 10 months ago
    makeArticle({ publishedAt: "2020-01-01T00:00:00.000Z" }), // years ago
  ];
  it("last week", () => {
    expect(applyFilters(articles, { ...emptyFilter(), datePreset: "week" }, NOW)).toHaveLength(1);
  });
  it("last month", () => {
    expect(applyFilters(articles, { ...emptyFilter(), datePreset: "month" }, NOW)).toHaveLength(2);
  });
  it("last year", () => {
    expect(applyFilters(articles, { ...emptyFilter(), datePreset: "year" }, NOW)).toHaveLength(3);
  });
  it("custom range is inclusive of both end days", () => {
    const state = {
      ...emptyFilter(),
      datePreset: "custom" as const,
      dateFrom: "2026-06-20",
      dateTo: "2026-07-09",
    };
    expect(applyFilters(articles, state, NOW)).toHaveLength(2);
  });
  it("custom range with only a from-date", () => {
    const state = {
      ...emptyFilter(),
      datePreset: "custom" as const,
      dateFrom: "2026-01-01",
      dateTo: null,
    };
    expect(applyFilters(articles, state, NOW)).toHaveLength(2);
  });
});

describe("companyCounts / topTags", () => {
  const articles = [
    makeArticle({ source: "meta", tags: ["ml", "infra"] }),
    makeArticle({ source: "meta", tags: ["ml"] }),
    makeArticle({ source: "google", tags: ["android"] }),
  ];
  it("counts per company, sorted by count desc then id", () => {
    expect(companyCounts(articles)).toEqual([
      { id: "meta", count: 2 },
      { id: "google", count: 1 },
    ]);
  });
  it("counts tags and caps at the limit", () => {
    expect(topTags(articles, 2)).toEqual([
      { tag: "ml", count: 2 },
      { tag: "android", count: 1 }, // ties broken alphabetically
    ]);
  });
});

describe("isNew", () => {
  it("is true when fetchedAt is within the last 24 hours", () => {
    expect(isNew(makeArticle({ fetchedAt: "2026-07-11T00:00:00.000Z" }), NOW)).toBe(true);
    expect(isNew(makeArticle({ fetchedAt: "2026-07-09T00:00:00.000Z" }), NOW)).toBe(false);
  });
});
