import { describe, expect, it } from "vitest";
import { resolveTags, UnmappedTagCollector } from "./tags.js";

describe("resolveTags", () => {
  it("resolves categories without needing the fallback text", () => {
    expect(resolveTags(["Kubernetes"], "test")).toEqual(["infra"]);
  });

  it("falls back to inferring from text when there are no categories", () => {
    const tags = resolveTags([], "test", "How we migrated our PostgreSQL database to Aurora");
    expect(tags).toContain("databases");
  });

  it("falls back to inferring from text when categories don't resolve to anything", () => {
    const unmapped = new UnmappedTagCollector();
    const tags = resolveTags(
      ["How We Build"],
      "test",
      "Scaling our Kubernetes clusters for peak traffic",
      unmapped,
    );
    expect(tags).toContain("infra");
    // the unresolved category is still recorded for review
    expect(unmapped.list()).toEqual([{ raw: "How We Build", source: "test", count: 1 }]);
  });

  it("does not fall back to text when a category already resolved", () => {
    const tags = resolveTags(["aws"], "test", "A totally unrelated post about company culture");
    expect(tags).toEqual(["cloud"]);
  });

  it("returns an empty array when neither categories nor text yield a match", () => {
    expect(resolveTags([], "test", "Our Q3 town hall recap")).toEqual([]);
  });
});
