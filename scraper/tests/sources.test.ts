import { describe, expect, it } from "vitest";
import { getSource, sources } from "../sources/index.js";

describe("source registry", () => {
  it("registers all sources with unique ids", () => {
    const ids = sources.map((s) => s.id).sort();
    expect(ids).toEqual([
      "airbnb",
      "anthropic",
      "atlassian",
      "aws-architecture",
      "aws-news",
      "booking",
      "canva",
      "cloudflare",
      "cockroachlabs",
      "coinbase",
      "databricks",
      "datadog",
      "deepmind",
      "discord",
      "doordash",
      "dropbox",
      "duolingo",
      "etsy",
      "figma",
      "github",
      "google",
      "grab",
      "huggingface",
      "instacart",
      "instagram",
      "janestreet",
      "line",
      "linkedin",
      "lyft",
      "meta",
      "netflix",
      "notion",
      "nvidia",
      "openai",
      "paypal",
      "pinterest",
      "shopify",
      "slack",
      "spotify",
      "stripe",
      "twitch",
      "uber",
      "yelp",
    ]);
    expect(new Set(ids).size).toBe(43);
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
