import { describe, expect, it } from "vitest";
import { allFailed, renderSummary, runSources, totalAdded } from "../src/run.js";
import type { Article, Source } from "../src/types.js";

function makeArticle(id: string, overrides: Partial<Article> = {}): Article {
  return {
    id,
    title: `Post ${id}`,
    url: `https://example.com/${id}`,
    source: "s1",
    publishedAt: "2026-07-01T00:00:00.000Z",
    tags: [],
    summary: "",
    thumbnail: null,
    fetchedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function memoryDeps(seed: Record<string, Article[]> = {}) {
  const store: Record<string, Article[]> = { ...seed };
  return {
    store,
    deps: {
      read: async (id: string) => store[id] ?? [],
      write: async (id: string, articles: Article[]) => {
        store[id] = articles;
      },
      log: () => {},
    },
  };
}

function makeSource(id: string, fetch: Source["fetch"]): Source {
  return { id, name: id, fetch };
}

describe("runSources", () => {
  it("fetches, validates, merges, and writes per source", async () => {
    const { store, deps } = memoryDeps({ s1: [makeArticle("existing")] });
    const source = makeSource("s1", async () => [
      makeArticle("fresh"),
      makeArticle("bad", { title: "" }), // dropped by validation
    ]);
    const results = await runSources([source], "fetch", deps);
    expect(results).toEqual([{ id: "s1", status: "ok", fetched: 1, added: 1 }]);
    expect(store.s1.map((a) => a.id).sort()).toEqual(["existing", "fresh"]);
  });

  it("isolates a failing source and keeps its data untouched", async () => {
    const { store, deps } = memoryDeps({ s1: [makeArticle("keep")] });
    const failing = makeSource("s1", async () => {
      throw new Error("boom");
    });
    const healthy = makeSource("s2", async () => [makeArticle("new", { source: "s2" })]);
    const results = await runSources([failing, healthy], "fetch", deps);
    expect(results[0].status).toBe("failed");
    expect(results[0].error).toContain("boom");
    expect(results[1].status).toBe("ok");
    expect(store.s1).toHaveLength(1); // untouched
  });

  it("guards a previously healthy source that returns 0 articles", async () => {
    const { store, deps } = memoryDeps({ s1: [makeArticle("keep")] });
    const empty = makeSource("s1", async () => []);
    const results = await runSources([empty], "fetch", deps);
    expect(results[0].status).toBe("guarded");
    expect(store.s1).toHaveLength(1); // never wiped
  });

  it("treats 0 articles for a brand-new source as ok", async () => {
    const { deps } = memoryDeps();
    const empty = makeSource("s1", async () => []);
    const results = await runSources([empty], "fetch", deps);
    expect(results[0].status).toBe("ok");
  });

  it("fails a source with no backfill in backfill mode", async () => {
    const { deps } = memoryDeps();
    const source = makeSource("s1", async () => []);
    const results = await runSources([source], "backfill", deps);
    expect(results[0].status).toBe("failed");
  });
});

describe("status helpers", () => {
  const ok = { id: "a", status: "ok", fetched: 2, added: 2 } as const;
  const failed = { id: "b", status: "failed", fetched: 0, added: 0, error: "x" } as const;

  it("allFailed is true only when every source failed", () => {
    expect(allFailed([failed, failed])).toBe(true);
    expect(allFailed([ok, failed])).toBe(false);
    expect(allFailed([])).toBe(false);
  });

  it("totalAdded sums added counts", () => {
    expect(totalAdded([ok, failed])).toBe(2);
  });

  it("renderSummary produces a markdown table row per source", () => {
    const table = renderSummary([ok, failed]);
    expect(table).toContain("| source | status | fetched | added | error |");
    expect(table).toContain("| a | ok | 2 | 2 |");
    expect(table).toContain("| b | failed | 0 | 0 | x |");
  });
});
