import { describe, expect, it } from "vitest";
import { getSource, sources } from "../sources/index.js";

describe("source registry", () => {
  it("registers the five v1 sources with unique ids", () => {
    const ids = sources.map((s) => s.id).sort();
    expect(ids).toEqual(["airbnb", "google", "meta", "netflix", "uber"]);
    expect(new Set(ids).size).toBe(5);
  });

  it("every source has a display name and a fetch strategy", () => {
    for (const source of sources) {
      expect(source.name.length).toBeGreaterThan(0);
      expect(typeof source.fetch).toBe("function");
    }
  });

  it("looks a source up by id", () => {
    expect(getSource("meta")?.name).toBe("Meta Engineering");
    expect(getSource("nope")).toBeUndefined();
  });
});
