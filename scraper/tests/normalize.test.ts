import { describe, expect, it } from "vitest";
import { articleId, normalizeUrl } from "../src/normalize.js";

describe("normalizeUrl", () => {
  it("lowercases the host", () => {
    expect(normalizeUrl("https://Engineering.FB.com/post")).toBe("https://engineering.fb.com/post");
  });
  it("strips the fragment", () => {
    expect(normalizeUrl("https://a.com/x#section")).toBe("https://a.com/x");
  });
  it("strips a trailing slash on non-root paths", () => {
    expect(normalizeUrl("https://a.com/x/")).toBe("https://a.com/x");
  });
  it("keeps query parameters as-is", () => {
    expect(normalizeUrl("https://a.com/x?utm=1&b=2")).toBe("https://a.com/x?utm=1&b=2");
  });
  it("does not touch path case", () => {
    expect(normalizeUrl("https://a.com/Some/Path")).toBe("https://a.com/Some/Path");
  });
});

describe("articleId", () => {
  it("is stable across normalization-equivalent URLs", () => {
    expect(articleId("https://A.com/x/#frag")).toBe(articleId("https://a.com/x"));
    expect(articleId("https://a.com/x")).toMatch(/^[0-9a-f]{40}$/);
  });
  it("differs for different query strings", () => {
    expect(articleId("https://a.com/x?p=1")).not.toBe(articleId("https://a.com/x?p=2"));
  });
});
