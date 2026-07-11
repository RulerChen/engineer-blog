import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CANONICAL_TAGS, resolveTags, UnmappedTagCollector } from "../src/tags.js";
import type { Article } from "../src/types.js";

describe("resolveTags", () => {
  it("resolves a raw tag via the exact-match table", () => {
    const unmapped = new UnmappedTagCollector();
    expect(resolveTags(["machine-learning"], "meta", unmapped)).toEqual(["ml"]);
    expect(unmapped.list()).toEqual([]);
  });

  it("is case- and whitespace-insensitive", () => {
    const unmapped = new UnmappedTagCollector();
    expect(resolveTags([" Machine-Learning "], "meta", unmapped)).toEqual(["ml"]);
  });

  it("resolves an unknown-but-recognizable tag via the keyword fallback", () => {
    const unmapped = new UnmappedTagCollector();
    expect(resolveTags(["Kubernetes Operators"], "acme", unmapped)).toEqual(["infra"]);
    expect(resolveTags(["Swift Concurrency"], "acme", unmapped)).toEqual(["mobile"]);
    expect(unmapped.list()).toEqual([]);
  });

  it("dedups multiple raw tags that map to the same canonical tag", () => {
    const unmapped = new UnmappedTagCollector();
    expect(resolveTags(["Android", "android-dev"], "meta", unmapped)).toEqual(["mobile"]);
  });

  it("drops and logs a raw tag that matches neither the table nor a keyword rule", () => {
    const unmapped = new UnmappedTagCollector();
    expect(resolveTags(["zzz-nonsense-topic"], "acme", unmapped)).toEqual([]);
    expect(unmapped.list()).toEqual([{ raw: "zzz-nonsense-topic", source: "acme", count: 1 }]);
  });

  it("counts repeated unmapped tags from the same source", () => {
    const unmapped = new UnmappedTagCollector();
    resolveTags(["zzz-nonsense-topic"], "acme", unmapped);
    resolveTags(["zzz-nonsense-topic"], "acme", unmapped);
    expect(unmapped.list()).toEqual([{ raw: "zzz-nonsense-topic", source: "acme", count: 2 }]);
  });

  it("ignores blank tags", () => {
    const unmapped = new UnmappedTagCollector();
    expect(resolveTags(["  ", ""], "acme", unmapped)).toEqual([]);
    expect(unmapped.list()).toEqual([]);
  });
});

describe("resolveTags against real scraped data", () => {
  it("resolves every raw tag currently in data/articles/*.json to a canonical tag", async () => {
    const dataDir = fileURLToPath(new URL("../../data/articles/", import.meta.url));
    const files = (await readdir(dataDir)).filter((f) => f.endsWith(".json"));
    const rawTags = new Set<string>();
    for (const file of files) {
      const articles = JSON.parse(await readFile(dataDir + file, "utf8")) as Article[];
      for (const article of articles) {
        for (const tag of article.tags) rawTags.add(tag);
      }
    }
    expect(rawTags.size).toBeGreaterThan(0);

    const unmapped = new UnmappedTagCollector();
    for (const raw of rawTags) {
      const resolved = resolveTags([raw], "snapshot", unmapped);
      expect(resolved.length, `expected "${raw}" to resolve to a canonical tag`).toBe(1);
      expect(CANONICAL_TAGS).toContain(resolved[0]);
    }
    expect(unmapped.list()).toEqual([]);
  });
});
