import { describe, expect, it } from "vitest";
import { stripHtml, summarize, truncate } from "../src/sanitize.js";

describe("stripHtml", () => {
  it("removes tags and collapses whitespace", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>\n<p>again</p>")).toBe("Hello world again");
  });
  it("decodes common entities", () => {
    expect(stripHtml("a &amp; b &lt;c&gt; &quot;d&quot; &#39;e&#39;&nbsp;f")).toBe(
      "a & b <c> \"d\" 'e' f",
    );
  });
});

describe("truncate", () => {
  it("returns short text unchanged", () => {
    expect(truncate("short", 300)).toBe("short");
  });
  it("cuts at a word boundary and appends an ellipsis", () => {
    expect(truncate("alpha beta gamma", 12)).toBe("alpha beta…");
  });
});

describe("summarize", () => {
  it("strips html then truncates to 300 chars", () => {
    const long = `<p>${"word ".repeat(100)}</p>`;
    const out = summarize(long);
    expect(out.length).toBeLessThanOrEqual(301); // 300 + ellipsis
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toContain("<p>");
  });
});
