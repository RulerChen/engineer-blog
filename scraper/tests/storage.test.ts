import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readSourceArticles, writeSourceArticles } from "../src/storage.js";
import type { Article } from "../src/types.js";

const article: Article = {
  id: "a".repeat(40),
  title: "A post",
  url: "https://example.com/post",
  source: "meta",
  publishedAt: "2026-07-01T00:00:00.000Z",
  tags: ["infra"],
  summary: "s",
  thumbnail: null,
  fetchedAt: "2026-07-01T00:00:00.000Z",
};

describe("storage", () => {
  it("returns [] for a missing file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "articles-"));
    expect(await readSourceArticles(dir, "meta")).toEqual([]);
  });

  it("round-trips articles through <source>.json", async () => {
    const dir = await mkdtemp(join(tmpdir(), "articles-"));
    await writeSourceArticles(dir, "meta", [article]);
    expect(await readSourceArticles(dir, "meta")).toEqual([article]);
  });

  it("writes pretty-printed JSON with a trailing newline (small diffs)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "articles-"));
    await writeSourceArticles(dir, "meta", [article]);
    const raw = await readFile(join(dir, "meta.json"), "utf8");
    expect(raw.endsWith("]\n")).toBe(true);
    expect(raw).toContain('  "id"'); // 2-space indent
  });

  it("creates the data dir if it does not exist", async () => {
    const dir = await mkdtemp(join(tmpdir(), "articles-"));
    const nested = join(dir, "deep", "articles");
    await writeSourceArticles(nested, "meta", [article]);
    expect(await readSourceArticles(nested, "meta")).toHaveLength(1);
  });
});
