# Engineer Blog Aggregator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A GitHub Pages static site that aggregates big-tech engineering blog articles (fetched daily by GitHub Actions into committed JSON) and lets users search/filter by text, company, tags, and date.

**Architecture:** An npm-workspaces monorepo with two TypeScript packages: `scraper/` (Node CLI run by CI; RSS fetch + merge/dedup into `data/articles/<source>.json`) and `frontend/` (Vue 3 + Vite SPA that loads one merged `articles.json` and filters in memory). Four GitHub Actions workflows tie it together: CI checks, daily fetch, manual backfill, and Pages deploy.

**Tech Stack:** TypeScript, Node 22, npm workspaces, `rss-parser`, `cheerio`, `tsx`, Vue 3, Vite 8 (Rolldown), Vitest (both packages), oxlint, oxfmt, `@vue/test-utils` + happy-dom, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-07-11-engineer-blog-aggregator-design.md`

## Global Constraints

- One language end to end: TypeScript. Test runner for both packages: Vitest.
- Toolchain is oxc-based: lint with `oxlint` (Vue support for `frontend/`), format with `oxfmt --check`, typecheck with `tsc --noEmit` (scraper) and `vue-tsc --noEmit` (frontend).
- Root package scripts must be exactly `lint`, `format`, `typecheck`, `test` and run the same commands CI runs.
- Frontend builds on Vite 8 (default Rolldown bundler) — no custom bundler config.
- Vite `base` must be `/engineer-blog/` (GitHub Pages project pathing).
- Data files live at `data/articles/<source>.json` — one file per source, pretty-printed (2-space indent + trailing newline) for small diffs, sorted newest-first by `publishedAt`.
- `Article.id` = sha1 hex of the normalized URL. URL normalization: lowercase host, strip fragment, strip trailing slash; query parameters kept as-is.
- Merge rule: fresh data wins field-by-field, **except `fetchedAt` which always keeps its original first-seen value**.
- Summaries are HTML-stripped and truncated to ~300 chars. Full article bodies are never fetched or stored.
- Search scope is metadata only: title, summary, tags, company, date.
- v1 sources: `google`, `meta`, `netflix`, `uber`, `airbnb`. Backfill scrapers only for google, meta, uber (Medium blocks scraping netflix/airbnb).
- Backfill scrapers: sequential requests, small delay between pages, honest User-Agent: `engineer-blog-aggregator/1.0 (+https://github.com/RulerChen/engineer-blog)`.
- Fetch runs: per-source try/catch isolation; workflow fails only if **every** source fails; if a previously healthy source returns 0 articles, warn and keep existing data.
- Fetch commit message format: `data: fetch YYYY-MM-DD (+N articles)`.
- Daily cron: 02:00 UTC. Backfill: `workflow_dispatch` only, never cron.
- CI is skipped for data-only commits (paths filter excludes `data/**`).
- Out of scope (do NOT build): full-text fetching, search libraries, routing, user accounts, bookmarks, dark mode, RSS output, analytics.
- Frequent commits: every task ends in a commit. All commits use conventional-commit prefixes (`feat:`, `test:`, `chore:`, `ci:`, `data:`, `docs:`).

## File Structure

```
engineer-blog/
├── package.json                  # workspaces root; lint/format/typecheck/test scripts
├── .gitignore
├── .oxlintrc.json                # oxlint config (shared)
├── scraper/
│   ├── package.json              # rss-parser, cheerio; tsx CLI scripts
│   ├── tsconfig.json
│   ├── src/
│   │   ├── types.ts              # Article, Source interfaces
│   │   ├── normalize.ts          # normalizeUrl, articleId
│   │   ├── sanitize.ts           # stripHtml, truncate, summarize
│   │   ├── validate.ts           # articleErrors, filterValid
│   │   ├── merge.ts              # merge(existing, fetched)
│   │   ├── http.ts               # USER_AGENT constant
│   │   ├── rss.ts                # parseFeed, fetchRss
│   │   ├── storage.ts            # readSourceArticles, writeSourceArticles
│   │   ├── backfill.ts           # crawlArchive harness (pagination + delay)
│   │   ├── run.ts                # runSources, allFailed, renderSummary, totalAdded
│   │   └── cli.ts                # entry: fetch all | backfill <source>
│   ├── sources/
│   │   ├── index.ts              # registry: sources[], getSource(id)
│   │   ├── google.ts             # RSS source + archive backfill parser
│   │   ├── meta.ts               # RSS source + WordPress archive backfill parser
│   │   ├── netflix.ts            # RSS only
│   │   ├── uber.ts               # RSS source + listing backfill parser
│   │   └── airbnb.ts             # RSS only
│   └── tests/
│       ├── fixtures/             # saved RSS XML + captured archive HTML
│       └── *.test.ts
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts            # base /engineer-blog/, vue plugin, vitest env
│   ├── index.html
│   ├── scripts/
│   │   └── mergeArticles.ts      # data/articles/*.json → public/articles.json
│   ├── src/
│   │   ├── main.ts
│   │   ├── style.css
│   │   ├── App.vue               # data load, stats header, wiring
│   │   ├── types.ts              # Article (kept in sync with scraper/src/types.ts)
│   │   ├── lib/
│   │   │   ├── sources.ts        # source id → display name
│   │   │   ├── filter.ts         # FilterState, applyFilters, companyCounts, topTags, isNew
│   │   │   └── urlState.ts       # stateToQuery, queryToState
│   │   ├── composables/
│   │   │   └── useArticleFilter.ts
│   │   └── components/
│   │       ├── SearchBar.vue
│   │       ├── FilterPanel.vue
│   │       ├── ArticleList.vue
│   │       └── ArticleCard.vue
│   └── tests/
│       └── *.test.ts
├── data/
│   └── articles/                 # committed JSON, seeded in Task 9
└── .github/workflows/
    ├── ci.yml
    ├── fetch.yml
    ├── backfill.yml
    └── deploy.yml
```

---

### Task 1: Root workspace + toolchain

**Files:**

- Create: `package.json`
- Create: `.gitignore`
- Create: `.oxlintrc.json`

**Interfaces:**

- Consumes: nothing (first task).
- Produces: root scripts `lint`, `format`, `format:fix`, `typecheck`, `test` that all later tasks and CI rely on; npm workspaces `scraper` and `frontend`.

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "engineer-blog",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22"
  },
  "workspaces": ["scraper", "frontend"],
  "scripts": {
    "lint": "oxlint .",
    "format": "oxfmt --check .",
    "format:fix": "oxfmt .",
    "typecheck": "npm run typecheck --workspaces",
    "test": "npm run test --workspaces"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```gitignore
node_modules/
dist/
coverage/
frontend/public/articles.json
*.log
```

- [ ] **Step 3: Create `.oxlintrc.json`**

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "categories": {
    "correctness": "error",
    "suspicious": "warn"
  },
  "ignorePatterns": ["dist", "coverage", "data"]
}
```

- [ ] **Step 4: Install toolchain**

Run: `npm install -D oxlint oxfmt`
Expected: succeeds; lockfile created. (If the published `oxfmt` beta uses a different check flag, run `npx oxfmt --help` and adjust the `format` script so it performs check-only — the script name `format` and check-only semantics are the contract.)

- [ ] **Step 5: Verify lint and format run clean**

Run: `npm run lint && npm run format`
Expected: both exit 0. If `oxfmt --check` flags the existing Markdown docs, run `npm run format:fix` once and include the reformat in this commit.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .gitignore .oxlintrc.json docs/
git commit -m "chore: root workspace with oxlint/oxfmt toolchain"
```

---

### Task 2: Scraper package scaffold + data model

**Files:**

- Create: `scraper/package.json`
- Create: `scraper/tsconfig.json`
- Create: `scraper/src/types.ts`
- Test: `scraper/tests/types.test.ts`

**Interfaces:**

- Consumes: root workspace from Task 1.
- Produces: `interface Article { id, title, url, source, publishedAt, tags, summary, thumbnail, fetchedAt }` and `interface Source { id, name, fetch, backfill? }` — every scraper task imports these from `../src/types.js`. Scripts `test`, `typecheck`, `fetch`, `backfill` inside the scraper package.

- [ ] **Step 1: Create `scraper/package.json`**

```json
{
  "name": "scraper",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "fetch": "tsx src/cli.ts fetch",
    "backfill": "tsx src/cli.ts backfill"
  }
}
```

- [ ] **Step 2: Install scraper dependencies**

Run (from repo root):
`npm install -w scraper rss-parser cheerio && npm install -w scraper -D typescript tsx vitest @types/node`
Expected: succeeds.

- [ ] **Step 3: Create `scraper/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src", "sources", "tests"]
}
```

- [ ] **Step 4: Create `scraper/src/types.ts`** (verbatim from spec)

```ts
export interface Article {
  id: string; // sha1 of normalized URL — stable dedup key
  title: string;
  url: string;
  source: string; // source id, e.g. "meta"
  publishedAt: string; // ISO 8601
  tags: string[]; // from RSS categories or scraped labels; may be empty
  summary: string; // RSS description, HTML-stripped, truncated to ~300 chars
  thumbnail: string | null; // cover image URL if the feed provides one
  fetchedAt: string; // ISO 8601, first time this article was seen
}

export interface Source {
  id: string; // "google", "meta", ...
  name: string; // "Meta Engineering"
  fetch: () => Promise<Article[]>; // daily strategy (RSS for all v1 sources)
  backfill?: () => Promise<Article[]>; // optional one-time archive scraper
}
```

- [ ] **Step 5: Write a compile-level sanity test — `scraper/tests/types.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import type { Article } from "../src/types.js";

describe("Article model", () => {
  it("accepts a fully populated article", () => {
    const article: Article = {
      id: "abc123",
      title: "Hello",
      url: "https://example.com/post",
      source: "meta",
      publishedAt: "2026-07-01T00:00:00.000Z",
      tags: ["infra"],
      summary: "A post.",
      thumbnail: null,
      fetchedAt: "2026-07-02T00:00:00.000Z",
    };
    expect(article.source).toBe("meta");
  });
});
```

- [ ] **Step 6: Run tests and typecheck**

Run: `npm run test -w scraper && npm run typecheck -w scraper`
Expected: 1 test PASS, typecheck clean.

- [ ] **Step 7: Commit**

```bash
git add scraper package.json package-lock.json
git commit -m "feat(scraper): package scaffold with Article/Source model"
```

---

### Task 3: URL normalization, id hashing, summary sanitization

**Files:**

- Create: `scraper/src/normalize.ts`
- Create: `scraper/src/sanitize.ts`
- Test: `scraper/tests/normalize.test.ts`
- Test: `scraper/tests/sanitize.test.ts`

**Interfaces:**

- Consumes: nothing beyond Node builtins.
- Produces: `normalizeUrl(raw: string): string`, `articleId(rawUrl: string): string` (sha1 hex of normalized URL), `stripHtml(html: string): string`, `truncate(text: string, max?: number): string`, `summarize(html: string): string` (strip + truncate to 300). Used by Tasks 5–12.

- [ ] **Step 1: Write failing tests — `scraper/tests/normalize.test.ts`**

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -w scraper`
Expected: FAIL — cannot resolve `../src/normalize.js`.

- [ ] **Step 3: Implement `scraper/src/normalize.ts`**

```ts
import { createHash } from "node:crypto";

/** Lowercase host, strip fragment, strip trailing slash; query kept as-is (v1). */
export function normalizeUrl(raw: string): string {
  const url = new URL(raw);
  url.hash = "";
  url.host = url.host.toLowerCase();
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
}

export function articleId(rawUrl: string): string {
  return createHash("sha1").update(normalizeUrl(rawUrl)).digest("hex");
}
```

- [ ] **Step 4: Write failing tests — `scraper/tests/sanitize.test.ts`**

```ts
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
```

- [ ] **Step 5: Run tests to verify the new ones fail**

Run: `npm run test -w scraper`
Expected: normalize tests PASS, sanitize tests FAIL (module missing).

- [ ] **Step 6: Implement `scraper/src/sanitize.ts`**

```ts
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(text: string, max = 300): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

/** RSS description → HTML-stripped summary, truncated to ~300 chars. */
export function summarize(html: string): string {
  return truncate(stripHtml(html));
}
```

- [ ] **Step 7: Run all scraper tests**

Run: `npm run test -w scraper`
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add scraper/src/normalize.ts scraper/src/sanitize.ts scraper/tests/normalize.test.ts scraper/tests/sanitize.test.ts
git commit -m "feat(scraper): url normalization, id hashing, summary sanitization"
```

---

### Task 4: Article validation

**Files:**

- Create: `scraper/src/validate.ts`
- Test: `scraper/tests/validate.test.ts`

**Interfaces:**

- Consumes: `Article` from Task 2.
- Produces: `articleErrors(article: Article): string[]` (empty = valid) and `filterValid(articles: Article[], onDrop?: (article: Article, errors: string[]) => void): Article[]`. Task 9's runner calls `filterValid` on every fetch result before merging.

- [ ] **Step 1: Write failing tests — `scraper/tests/validate.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import type { Article } from "../src/types.js";
import { articleErrors, filterValid } from "../src/validate.js";

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: "a".repeat(40),
    title: "A post",
    url: "https://example.com/post",
    source: "meta",
    publishedAt: "2026-07-01T00:00:00.000Z",
    tags: [],
    summary: "",
    thumbnail: null,
    fetchedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("articleErrors", () => {
  it("passes a valid article", () => {
    expect(articleErrors(makeArticle())).toEqual([]);
  });
  it("rejects an empty title", () => {
    expect(articleErrors(makeArticle({ title: "  " }))).toContain("empty title");
  });
  it("rejects a relative or garbage url", () => {
    expect(articleErrors(makeArticle({ url: "/relative/path" }))).toContain("invalid url");
  });
  it("rejects a non-http(s) url", () => {
    expect(articleErrors(makeArticle({ url: "ftp://a.com/x" }))).toContain("url not http(s)");
  });
  it("rejects an unparseable date", () => {
    expect(articleErrors(makeArticle({ publishedAt: "not a date" }))).toContain(
      "unparseable publishedAt",
    );
  });
});

describe("filterValid", () => {
  it("drops invalid entries and reports them", () => {
    const good = makeArticle();
    const bad = makeArticle({ title: "", url: "nope" });
    const dropped: string[][] = [];
    const result = filterValid([good, bad], (_a, errors) => dropped.push(errors));
    expect(result).toEqual([good]);
    expect(dropped).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -w scraper`
Expected: FAIL — cannot resolve `../src/validate.js`.

- [ ] **Step 3: Implement `scraper/src/validate.ts`**

```ts
import type { Article } from "./types.js";

/** Schema check per spec: valid absolute http(s) URL, non-empty title, parseable date. */
export function articleErrors(article: Article): string[] {
  const errors: string[] = [];
  if (!article.title || article.title.trim() === "") errors.push("empty title");
  try {
    const url = new URL(article.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      errors.push("url not http(s)");
    }
  } catch {
    errors.push("invalid url");
  }
  if (Number.isNaN(Date.parse(article.publishedAt))) {
    errors.push("unparseable publishedAt");
  }
  return errors;
}

export function filterValid(
  articles: Article[],
  onDrop: (article: Article, errors: string[]) => void = (article, errors) =>
    console.warn(`dropping ${article.url || "<no url>"}: ${errors.join(", ")}`),
): Article[] {
  return articles.filter((article) => {
    const errors = articleErrors(article);
    if (errors.length > 0) {
      onDrop(article, errors);
      return false;
    }
    return true;
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -w scraper`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add scraper/src/validate.ts scraper/tests/validate.test.ts
git commit -m "feat(scraper): article schema validation with drop-and-log"
```

---

### Task 5: Merge & dedup

**Files:**

- Create: `scraper/src/merge.ts`
- Test: `scraper/tests/merge.test.ts`

**Interfaces:**

- Consumes: `Article` from Task 2.
- Produces: `merge(existing: Article[], fetched: Article[]): Article[]` — pure function; dedup by `id`; fresh data wins field-by-field except `fetchedAt` (keeps first-seen); result sorted newest-first by `publishedAt`. Used by Task 9's runner and nothing else.

- [ ] **Step 1: Write failing tests — `scraper/tests/merge.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { merge } from "../src/merge.js";
import type { Article } from "../src/types.js";

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: "id-1",
    title: "Original title",
    url: "https://example.com/post",
    source: "meta",
    publishedAt: "2026-07-01T00:00:00.000Z",
    tags: [],
    summary: "old summary",
    thumbnail: null,
    fetchedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("merge", () => {
  it("adds new articles to existing ones", () => {
    const existing = [makeArticle({ id: "id-1" })];
    const fetched = [makeArticle({ id: "id-2", url: "https://example.com/other" })];
    expect(merge(existing, fetched)).toHaveLength(2);
  });

  it("fresh data wins field-by-field on re-fetch", () => {
    const existing = [makeArticle({ title: "Old", tags: [], summary: "old" })];
    const fetched = [
      makeArticle({
        title: "Fixed title",
        tags: ["ml"],
        summary: "updated",
        fetchedAt: "2026-07-11T00:00:00.000Z",
      }),
    ];
    const [merged] = merge(existing, fetched);
    expect(merged.title).toBe("Fixed title");
    expect(merged.tags).toEqual(["ml"]);
    expect(merged.summary).toBe("updated");
  });

  it("always keeps the original first-seen fetchedAt", () => {
    const existing = [makeArticle({ fetchedAt: "2026-06-01T00:00:00.000Z" })];
    const fetched = [makeArticle({ fetchedAt: "2026-07-11T00:00:00.000Z" })];
    expect(merge(existing, fetched)[0].fetchedAt).toBe("2026-06-01T00:00:00.000Z");
  });

  it("sorts newest-first by publishedAt", () => {
    const existing = [makeArticle({ id: "old", publishedAt: "2025-01-01T00:00:00.000Z" })];
    const fetched = [
      makeArticle({ id: "new", publishedAt: "2026-07-10T00:00:00.000Z" }),
      makeArticle({ id: "mid", publishedAt: "2026-01-01T00:00:00.000Z" }),
    ];
    expect(merge(existing, fetched).map((a) => a.id)).toEqual(["new", "mid", "old"]);
  });

  it("returns existing untouched when fetched is empty", () => {
    const existing = [makeArticle()];
    expect(merge(existing, [])).toEqual(existing);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -w scraper`
Expected: FAIL — cannot resolve `../src/merge.js`.

- [ ] **Step 3: Implement `scraper/src/merge.ts`**

```ts
import type { Article } from "./types.js";

/**
 * Pure merge: dedup by id, fresh data wins field-by-field — except fetchedAt,
 * which always keeps its original first-seen value. Sorted newest-first.
 */
export function merge(existing: Article[], fetched: Article[]): Article[] {
  const byId = new Map(existing.map((article) => [article.id, article]));
  for (const incoming of fetched) {
    const prior = byId.get(incoming.id);
    byId.set(incoming.id, prior ? { ...incoming, fetchedAt: prior.fetchedAt } : incoming);
  }
  return [...byId.values()].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -w scraper`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add scraper/src/merge.ts scraper/tests/merge.test.ts
git commit -m "feat(scraper): merge/dedup with fresh-wins and fetchedAt preservation"
```

---

### Task 6: Generic RSS fetcher

**Files:**

- Create: `scraper/src/http.ts`
- Create: `scraper/src/rss.ts`
- Create: `scraper/tests/fixtures/sample-feed.xml`
- Test: `scraper/tests/rss.test.ts`

**Interfaces:**

- Consumes: `articleId`, `normalizeUrl` (Task 3), `summarize` (Task 3), `Article` (Task 2).
- Produces: `USER_AGENT: string` constant; `parseFeed(xml: string, sourceId: string, now?: Date): Promise<Article[]>`; `fetchRss(feedUrl: string, sourceId: string, fetchImpl?: typeof fetch): Promise<Article[]>`. Every source module in Task 8 calls `fetchRss`. The backfill harness in Task 10 reuses `USER_AGENT`.

- [ ] **Step 1: Create the fixture — `scraper/tests/fixtures/sample-feed.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Example Engineering</title>
    <link>https://Engineering.Example.com/</link>
    <item>
      <title>Scaling our data platform</title>
      <link>https://Engineering.Example.com/2026/07/scaling-data-platform/#more</link>
      <pubDate>Wed, 08 Jul 2026 12:00:00 +0000</pubDate>
      <category>data</category>
      <category>infra</category>
      <description><![CDATA[<p>How we <b>scaled</b> our data platform to petabytes.</p>]]></description>
      <enclosure url="https://engineering.example.com/img/cover.png" type="image/png" length="1000"/>
    </item>
    <item>
      <title>A post with no extras</title>
      <link>https://engineering.example.com/2026/07/no-extras</link>
      <pubDate>Tue, 07 Jul 2026 09:30:00 +0000</pubDate>
      <description>Plain text description.</description>
    </item>
    <item>
      <title>Broken item without a link</title>
      <pubDate>Mon, 06 Jul 2026 09:30:00 +0000</pubDate>
    </item>
  </channel>
</rss>
```

- [ ] **Step 2: Write failing tests — `scraper/tests/rss.test.ts`**

```ts
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test -w scraper`
Expected: FAIL — cannot resolve `../src/rss.js`.

- [ ] **Step 4: Implement `scraper/src/http.ts`**

```ts
export const USER_AGENT =
  "engineer-blog-aggregator/1.0 (+https://github.com/RulerChen/engineer-blog)";
```

- [ ] **Step 5: Implement `scraper/src/rss.ts`**

```ts
import Parser from "rss-parser";
import { USER_AGENT } from "./http.js";
import { articleId, normalizeUrl } from "./normalize.js";
import { summarize } from "./sanitize.js";
import type { Article } from "./types.js";

const parser = new Parser();

/** Parse RSS/Atom XML into normalized Articles. Items without a link are skipped. */
export async function parseFeed(
  xml: string,
  sourceId: string,
  now = new Date(),
): Promise<Article[]> {
  const feed = await parser.parseString(xml);
  const fetchedAt = now.toISOString();
  const articles: Article[] = [];
  for (const item of feed.items) {
    if (!item.link) continue;
    articles.push({
      id: articleId(item.link),
      title: (item.title ?? "").trim(),
      url: normalizeUrl(item.link),
      source: sourceId,
      publishedAt: item.isoDate ?? (item.pubDate ? new Date(item.pubDate).toISOString() : ""),
      tags: (item.categories ?? []).map((c) => c.trim()).filter(Boolean),
      summary: summarize(item.content ?? item.contentSnippet ?? ""),
      thumbnail: item.enclosure?.url ?? null,
      fetchedAt,
    });
  }
  return articles;
}

/** Generic daily fetcher: takes a feed URL and source id, returns normalized Articles. */
export async function fetchRss(
  feedUrl: string,
  sourceId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Article[]> {
  const res = await fetchImpl(feedUrl, { headers: { "user-agent": USER_AGENT } });
  if (!res.ok) throw new Error(`${feedUrl}: HTTP ${res.status}`);
  return parseFeed(await res.text(), sourceId);
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm run test -w scraper`
Expected: all PASS. If the `summary` assertion fails because `rss-parser` exposes the CDATA description differently, inspect the parsed item (add a temporary `console.log(item)`), fix the field priority in `parseFeed` (not the fixture), and re-run.

- [ ] **Step 7: Commit**

```bash
git add scraper/src/http.ts scraper/src/rss.ts scraper/tests/rss.test.ts scraper/tests/fixtures/sample-feed.xml
git commit -m "feat(scraper): generic rss fetcher with fixture-based parser test"
```

---

### Task 7: JSON storage

**Files:**

- Create: `scraper/src/storage.ts`
- Test: `scraper/tests/storage.test.ts`

**Interfaces:**

- Consumes: `Article` (Task 2).
- Produces: `readSourceArticles(dataDir: string, sourceId: string): Promise<Article[]>` (missing file → `[]`) and `writeSourceArticles(dataDir: string, sourceId: string, articles: Article[]): Promise<void>` (2-space pretty print + trailing newline, creates `dataDir` if needed). Task 9's CLI binds these to `data/articles/`.

- [ ] **Step 1: Write failing tests — `scraper/tests/storage.test.ts`**

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -w scraper`
Expected: FAIL — cannot resolve `../src/storage.js`.

- [ ] **Step 3: Implement `scraper/src/storage.ts`**

```ts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Article } from "./types.js";

export async function readSourceArticles(dataDir: string, sourceId: string): Promise<Article[]> {
  try {
    return JSON.parse(await readFile(join(dataDir, `${sourceId}.json`), "utf8")) as Article[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

export async function writeSourceArticles(
  dataDir: string,
  sourceId: string,
  articles: Article[],
): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  await writeFile(
    join(dataDir, `${sourceId}.json`),
    JSON.stringify(articles, null, 2) + "\n",
    "utf8",
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -w scraper`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add scraper/src/storage.ts scraper/tests/storage.test.ts
git commit -m "feat(scraper): per-source json storage"
```

---

### Task 8: Source registry with five RSS sources

**Files:**

- Create: `scraper/sources/google.ts`
- Create: `scraper/sources/meta.ts`
- Create: `scraper/sources/netflix.ts`
- Create: `scraper/sources/uber.ts`
- Create: `scraper/sources/airbnb.ts`
- Create: `scraper/sources/index.ts`
- Test: `scraper/tests/sources.test.ts`

**Interfaces:**

- Consumes: `Source` (Task 2), `fetchRss` (Task 6).
- Produces: `sources: Source[]` and `getSource(id: string): Source | undefined` from `scraper/sources/index.ts`. Task 9's CLI iterates `sources`; Tasks 10–12 add `backfill` properties to `meta`, `google`, `uber` in place.

- [ ] **Step 1: Verify the live feed URLs**

The spec allows substituting a moved feed for the same blog. For each candidate below, run the curl check; if the primary 404s or returns HTML instead of XML, try the fallback, and if both fail, find the blog's advertised feed (look for `<link rel="alternate" type="application/rss+xml">` in the blog homepage HTML) and use that.

```bash
UA="engineer-blog-aggregator/1.0 (+https://github.com/RulerChen/engineer-blog)"
for feed in \
  "https://developers.googleblog.com/feeds/posts/default?alt=rss" \
  "https://engineering.fb.com/feed/" \
  "https://netflixtechblog.com/feed" \
  "https://www.uber.com/blog/engineering/rss/" \
  "https://medium.com/feed/airbnb-engineering"; do
  echo "== $feed"
  curl -sL -A "$UA" "$feed" | head -c 200
  echo
done
```

Expected per feed: output starts with `<?xml` (or `<rss`/`<feed`) and contains `<item>`/`<entry>` further in. Fallbacks: google → `https://developers.googleblog.com/rss.xml`; uber → `https://eng.uber.com/feed/`. Record the verified URL in each source module below.

- [ ] **Step 2: Write failing tests — `scraper/tests/sources.test.ts`**

```ts
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test -w scraper`
Expected: FAIL — cannot resolve `../sources/index.js`.

- [ ] **Step 4: Implement the five source modules**

`scraper/sources/google.ts` (use the URL verified in Step 1):

```ts
import { fetchRss } from "../src/rss.js";
import type { Source } from "../src/types.js";

export const google: Source = {
  id: "google",
  name: "Google Developers",
  fetch: () => fetchRss("https://developers.googleblog.com/feeds/posts/default?alt=rss", "google"),
};
```

`scraper/sources/meta.ts`:

```ts
import { fetchRss } from "../src/rss.js";
import type { Source } from "../src/types.js";

export const meta: Source = {
  id: "meta",
  name: "Meta Engineering",
  fetch: () => fetchRss("https://engineering.fb.com/feed/", "meta"),
};
```

`scraper/sources/netflix.ts`:

```ts
import { fetchRss } from "../src/rss.js";
import type { Source } from "../src/types.js";

export const netflix: Source = {
  id: "netflix",
  name: "Netflix Tech Blog",
  fetch: () => fetchRss("https://netflixtechblog.com/feed", "netflix"),
};
```

`scraper/sources/uber.ts`:

```ts
import { fetchRss } from "../src/rss.js";
import type { Source } from "../src/types.js";

export const uber: Source = {
  id: "uber",
  name: "Uber Engineering",
  fetch: () => fetchRss("https://www.uber.com/blog/engineering/rss/", "uber"),
};
```

`scraper/sources/airbnb.ts`:

```ts
import { fetchRss } from "../src/rss.js";
import type { Source } from "../src/types.js";

export const airbnb: Source = {
  id: "airbnb",
  name: "Airbnb Engineering",
  fetch: () => fetchRss("https://medium.com/feed/airbnb-engineering", "airbnb"),
};
```

`scraper/sources/index.ts`:

```ts
import type { Source } from "../src/types.js";
import { airbnb } from "./airbnb.js";
import { google } from "./google.js";
import { meta } from "./meta.js";
import { netflix } from "./netflix.js";
import { uber } from "./uber.js";

/** Adding a source later = adding one entry here (and one module). */
export const sources: Source[] = [google, meta, netflix, uber, airbnb];

export function getSource(id: string): Source | undefined {
  return sources.find((source) => source.id === id);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -w scraper`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add scraper/sources scraper/tests/sources.test.ts
git commit -m "feat(scraper): source registry with five rss sources"
```

---

### Task 9: Runner, CLI, and initial data seed

**Files:**

- Create: `scraper/src/run.ts`
- Create: `scraper/src/cli.ts`
- Test: `scraper/tests/run.test.ts`
- Create (by running the CLI): `data/articles/*.json`

**Interfaces:**

- Consumes: `sources`/`getSource` (Task 8), `merge` (Task 5), `filterValid` (Task 4), `readSourceArticles`/`writeSourceArticles` (Task 7).
- Produces:
  - `interface SourceResult { id: string; status: "ok" | "failed" | "guarded"; fetched: number; added: number; error?: string }`
  - `runSources(sources: Source[], mode: "fetch" | "backfill", deps: RunDeps): Promise<SourceResult[]>` where `interface RunDeps { read(sourceId: string): Promise<Article[]>; write(sourceId: string, articles: Article[]): Promise<void>; log?(msg: string): void }`
  - `allFailed(results: SourceResult[]): boolean`, `totalAdded(results: SourceResult[]): number`, `renderSummary(results: SourceResult[]): string` (markdown table)
  - CLI behavior the workflows in Tasks 21–23 rely on: `npm run fetch -w scraper` runs all sources; `npm run backfill -w scraper -- <source>` runs one source's backfill; writes the summary table to `$GITHUB_STEP_SUMMARY` when set; writes `added=N` to `$GITHUB_OUTPUT` when set; exits 1 only when **every** source failed.

- [ ] **Step 1: Write failing tests — `scraper/tests/run.test.ts`**

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -w scraper`
Expected: FAIL — cannot resolve `../src/run.js`.

- [ ] **Step 3: Implement `scraper/src/run.ts`**

```ts
import { merge } from "./merge.js";
import type { Article, Source } from "./types.js";
import { filterValid } from "./validate.js";

export interface SourceResult {
  id: string;
  status: "ok" | "failed" | "guarded";
  fetched: number;
  added: number;
  error?: string;
}

export interface RunDeps {
  read(sourceId: string): Promise<Article[]>;
  write(sourceId: string, articles: Article[]): Promise<void>;
  log?(msg: string): void;
}

/** Per-source isolation: one failure never stops the run or touches that source's data. */
export async function runSources(
  sourceList: Source[],
  mode: "fetch" | "backfill",
  deps: RunDeps,
): Promise<SourceResult[]> {
  const log = deps.log ?? ((msg: string) => console.error(msg));
  const results: SourceResult[] = [];
  for (const source of sourceList) {
    try {
      const strategy = mode === "backfill" ? source.backfill : source.fetch;
      if (!strategy) throw new Error(`source ${source.id} has no ${mode} strategy`);
      const fetched = filterValid(await strategy(), (article, errors) =>
        log(`WARN ${source.id}: dropping ${article.url || "<no url>"}: ${errors.join(", ")}`),
      );
      const existing = await deps.read(source.id);
      if (fetched.length === 0 && existing.length > 0) {
        log(
          `WARN ${source.id}: previously healthy source returned 0 articles; keeping existing data`,
        );
        results.push({ id: source.id, status: "guarded", fetched: 0, added: 0 });
        continue;
      }
      const merged = merge(existing, fetched);
      await deps.write(source.id, merged);
      results.push({
        id: source.id,
        status: "ok",
        fetched: fetched.length,
        added: merged.length - existing.length,
      });
    } catch (err) {
      log(`ERROR ${source.id}: ${String(err)}`);
      results.push({ id: source.id, status: "failed", fetched: 0, added: 0, error: String(err) });
    }
  }
  return results;
}

/** The workflow goes red only when every source failed. */
export function allFailed(results: SourceResult[]): boolean {
  return results.length > 0 && results.every((r) => r.status === "failed");
}

export function totalAdded(results: SourceResult[]): number {
  return results.reduce((sum, r) => sum + r.added, 0);
}

/** Markdown table for the GitHub Actions job summary. */
export function renderSummary(results: SourceResult[]): string {
  return [
    "| source | status | fetched | added | error |",
    "| --- | --- | --- | --- | --- |",
    ...results.map(
      (r) => `| ${r.id} | ${r.status} | ${r.fetched} | ${r.added} | ${r.error ?? ""} |`,
    ),
  ].join("\n");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -w scraper`
Expected: all PASS.

- [ ] **Step 5: Implement `scraper/src/cli.ts`**

```ts
import { appendFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { getSource, sources } from "../sources/index.js";
import { allFailed, renderSummary, runSources, totalAdded } from "./run.js";
import { readSourceArticles, writeSourceArticles } from "./storage.js";

const dataDir = fileURLToPath(new URL("../../data/articles/", import.meta.url));
const [, , mode, sourceId] = process.argv;

if (mode !== "fetch" && mode !== "backfill") {
  console.error("usage: cli.ts fetch | cli.ts backfill <source-id>");
  process.exit(2);
}

let selected = sources;
if (mode === "backfill") {
  const source = sourceId ? getSource(sourceId) : undefined;
  if (!source) {
    console.error(`unknown source "${sourceId}". known: ${sources.map((s) => s.id).join(", ")}`);
    process.exit(2);
  }
  selected = [source];
}

const results = await runSources(selected, mode, {
  read: (id) => readSourceArticles(dataDir, id),
  write: (id, articles) => writeSourceArticles(dataDir, id, articles),
});

const summary = renderSummary(results);
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `## Fetch results\n\n${summary}\n`);
}
if (process.env.GITHUB_OUTPUT) {
  await appendFile(process.env.GITHUB_OUTPUT, `added=${totalAdded(results)}\n`);
}
if (allFailed(results)) {
  console.error("all sources failed");
  process.exit(1);
}
```

- [ ] **Step 6: Typecheck and lint**

Run: `npm run typecheck -w scraper && npm run lint`
Expected: clean.

- [ ] **Step 7: Seed the archive — run the real fetch once**

Run: `npm run fetch -w scraper`
Expected: summary table on stdout with all five sources `ok` and `fetched > 0`. If a source fails, fix its feed URL (Task 8 Step 1 fallbacks) before proceeding. Then spot-check one file:

Run: `node -e "const a=require('./data/articles/meta.json'); console.log(a.length, a[0].title, a[0].publishedAt)"`
Expected: a count ≥ 10, a real title, an ISO date. Also verify newest-first ordering and that every entry has all nine Article fields.

- [ ] **Step 8: Commit (code and data separately)**

```bash
git add scraper/src/run.ts scraper/src/cli.ts scraper/tests/run.test.ts
git commit -m "feat(scraper): runner with per-source isolation, breakage guard, and cli"
git add data/articles
git commit -m "data: fetch $(date -u +%F) (initial seed)"
```

---

### Task 10: Backfill crawl harness + Meta archive scraper

**Files:**

- Create: `scraper/src/backfill.ts`
- Modify: `scraper/sources/meta.ts`
- Create (captured): `scraper/tests/fixtures/meta-archive.html`
- Test: `scraper/tests/backfill.test.ts`
- Test: `scraper/tests/meta-archive.test.ts`

**Interfaces:**

- Consumes: `USER_AGENT` (Task 6), `articleId`/`normalizeUrl` (Task 3), `summarize` (Task 3), `articleErrors` (Task 4), `Article` (Task 2).
- Produces:
  - `interface ArchivePage { articles: Article[]; nextUrl: string | null }`
  - `crawlArchive(startUrl: string, parsePage: (html: string, pageUrl: string) => ArchivePage, opts?: { delayMs?: number; maxPages?: number; fetchImpl?: typeof fetch }): Promise<Article[]>` — sequential, default 1500 ms delay between pages, 200-page safety cap, honest User-Agent.
  - `parseMetaArchivePage(html: string, pageUrl: string): ArchivePage` exported from `scraper/sources/meta.ts`, wired as `meta.backfill`.
  - Tasks 11–12 reuse `crawlArchive` and copy this task's fixture-first test shape.

- [ ] **Step 1: Write failing harness tests — `scraper/tests/backfill.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { crawlArchive } from "../src/backfill.js";
import type { Article } from "../src/types.js";

function makeArticle(id: string): Article {
  return {
    id,
    title: id,
    url: `https://example.com/${id}`,
    source: "s1",
    publishedAt: "2026-07-01T00:00:00.000Z",
    tags: [],
    summary: "",
    thumbnail: null,
    fetchedAt: "2026-07-01T00:00:00.000Z",
  };
}

function fakeFetch(pages: Record<string, string>): typeof fetch {
  return (async (url: RequestInfo | URL) =>
    new Response(pages[String(url)] ?? "", {
      status: pages[String(url)] ? 200 : 404,
    })) as typeof fetch;
}

describe("crawlArchive", () => {
  it("follows nextUrl across pages and concatenates articles", async () => {
    const requested: string[] = [];
    const fetchImpl: typeof fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
      requested.push(String(url));
      expect(new Headers(init?.headers).get("user-agent")).toContain("engineer-blog-aggregator");
      return new Response(String(url), { status: 200 });
    }) as typeof fetch;
    const articles = await crawlArchive(
      "https://a.com/page/1",
      (html, pageUrl) => ({
        articles: [makeArticle(pageUrl)],
        nextUrl: pageUrl.endsWith("/1") ? "https://a.com/page/2" : null,
      }),
      { delayMs: 0, fetchImpl },
    );
    expect(requested).toEqual(["https://a.com/page/1", "https://a.com/page/2"]);
    expect(articles).toHaveLength(2);
  });

  it("stops at maxPages even if nextUrl keeps going", async () => {
    const articles = await crawlArchive(
      "https://a.com/page/1",
      (_html, pageUrl) => ({ articles: [makeArticle(pageUrl)], nextUrl: pageUrl }),
      { delayMs: 0, maxPages: 3, fetchImpl: fakeFetch({ "https://a.com/page/1": "x" }) },
    );
    expect(articles).toHaveLength(3);
  });

  it("throws on a non-200 response", async () => {
    await expect(
      crawlArchive("https://a.com/missing", () => ({ articles: [], nextUrl: null }), {
        delayMs: 0,
        fetchImpl: fakeFetch({}),
      }),
    ).rejects.toThrow("404");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -w scraper`
Expected: FAIL — cannot resolve `../src/backfill.js`.

- [ ] **Step 3: Implement `scraper/src/backfill.ts`**

```ts
import { USER_AGENT } from "./http.js";
import type { Article } from "./types.js";

export interface ArchivePage {
  articles: Article[];
  nextUrl: string | null;
}

export interface CrawlOpts {
  delayMs?: number;
  maxPages?: number;
  fetchImpl?: typeof fetch;
}

/**
 * Sequential archive crawler: one request at a time, a polite delay between
 * pages, an honest User-Agent, and a hard page cap as a runaway guard.
 */
export async function crawlArchive(
  startUrl: string,
  parsePage: (html: string, pageUrl: string) => ArchivePage,
  opts: CrawlOpts = {},
): Promise<Article[]> {
  const { delayMs = 1500, maxPages = 200, fetchImpl = fetch } = opts;
  const all: Article[] = [];
  let url: string | null = startUrl;
  for (let page = 0; url !== null && page < maxPages; page++) {
    if (page > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    const res = await fetchImpl(url, { headers: { "user-agent": USER_AGENT } });
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    const { articles, nextUrl } = parsePage(await res.text(), url);
    all.push(...articles);
    url = nextUrl;
  }
  return all;
}
```

- [ ] **Step 4: Run harness tests to verify they pass**

Run: `npm run test -w scraper`
Expected: all PASS.

- [ ] **Step 5: Capture a real Meta archive page as a fixture**

```bash
UA="engineer-blog-aggregator/1.0 (+https://github.com/RulerChen/engineer-blog)"
curl -sL -A "$UA" "https://engineering.fb.com/page/2/" -o scraper/tests/fixtures/meta-archive.html
wc -c scraper/tests/fixtures/meta-archive.html
```

Expected: a non-trivial file (> 20 KB). Open it and identify: the post container element, the title link, the `<time datetime="...">` element, category links, and the next-page link. engineering.fb.com is WordPress; the selectors in Step 7 are the WordPress defaults — adjust them to what the fixture actually contains before running the test.

- [ ] **Step 6: Write failing structural tests — `scraper/tests/meta-archive.test.ts`**

Structural assertions (not exact titles) so the test survives fixture recaptures:

```ts
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseMetaArchivePage } from "../sources/meta.js";
import { articleErrors } from "../src/validate.js";

const html = await readFile(new URL("./fixtures/meta-archive.html", import.meta.url), "utf8");

describe("parseMetaArchivePage", () => {
  const page = parseMetaArchivePage(html, "https://engineering.fb.com/page/2/");

  it("extracts a full page of posts", () => {
    expect(page.articles.length).toBeGreaterThanOrEqual(5);
  });

  it("every extracted article passes validation", () => {
    for (const article of page.articles) {
      expect(articleErrors(article)).toEqual([]);
      expect(article.url.startsWith("https://engineering.fb.com/")).toBe(true);
      expect(article.source).toBe("meta");
    }
  });

  it("finds the next page link", () => {
    expect(page.nextUrl).toMatch(/engineering\.fb\.com\/page\/\d+/);
  });
});
```

- [ ] **Step 7: Run test to verify it fails, then implement the parser in `scraper/sources/meta.ts`**

Run: `npm run test -w scraper` → FAIL (`parseMetaArchivePage` not exported).

Replace `scraper/sources/meta.ts` with:

```ts
import * as cheerio from "cheerio";
import type { ArchivePage } from "../src/backfill.js";
import { crawlArchive } from "../src/backfill.js";
import { articleId, normalizeUrl } from "../src/normalize.js";
import { fetchRss } from "../src/rss.js";
import { summarize } from "../src/sanitize.js";
import type { Article, Source } from "../src/types.js";

/** WordPress archive page → articles + next-page link. Selectors match the captured fixture. */
export function parseMetaArchivePage(html: string, _pageUrl: string): ArchivePage {
  const $ = cheerio.load(html);
  const fetchedAt = new Date().toISOString();
  const articles: Article[] = [];
  $("article").each((_i, el) => {
    const post = $(el);
    const link = post.find("h2 a, h3 a, .entry-title a").first();
    const href = link.attr("href");
    if (!href) return;
    const datetime = post.find("time[datetime]").first().attr("datetime") ?? "";
    articles.push({
      id: articleId(href),
      title: link.text().trim(),
      url: normalizeUrl(href),
      source: "meta",
      publishedAt: datetime ? new Date(datetime).toISOString() : "",
      tags: post
        .find('a[rel~="category"], .cat-links a')
        .map((_j, tag) => $(tag).text().trim())
        .get()
        .filter(Boolean),
      summary: summarize(post.find(".entry-content, .entry-summary, p").first().html() ?? ""),
      thumbnail: post.find("img").first().attr("src") ?? null,
      fetchedAt,
    });
  });
  const nextUrl = $('a.next, a[rel="next"], .nav-previous a').first().attr("href") ?? null;
  return { articles, nextUrl };
}

export const meta: Source = {
  id: "meta",
  name: "Meta Engineering",
  fetch: () => fetchRss("https://engineering.fb.com/feed/", "meta"),
  backfill: () => crawlArchive("https://engineering.fb.com/", parseMetaArchivePage),
};
```

If a structural assertion fails, adjust the selectors to the fixture's actual markup (the fixture is the source of truth) and re-run until green.

- [ ] **Step 8: Run all tests, typecheck**

Run: `npm run test -w scraper && npm run typecheck -w scraper`
Expected: all PASS, typecheck clean.

- [ ] **Step 9: Commit**

```bash
git add scraper/src/backfill.ts scraper/sources/meta.ts scraper/tests/backfill.test.ts scraper/tests/meta-archive.test.ts scraper/tests/fixtures/meta-archive.html
git commit -m "feat(scraper): backfill crawl harness and meta archive scraper"
```

---

### Task 11: Google archive backfill scraper

**Files:**

- Modify: `scraper/sources/google.ts`
- Create (captured): `scraper/tests/fixtures/google-archive.html`
- Test: `scraper/tests/google-archive.test.ts`

**Interfaces:**

- Consumes: `crawlArchive`/`ArchivePage` (Task 10), `articleId`/`normalizeUrl`/`summarize` (Task 3), `fetchRss` (Task 6), `articleErrors` (Task 4).
- Produces: `parseGoogleArchivePage(html: string, pageUrl: string): ArchivePage` exported from `scraper/sources/google.ts`, wired as `google.backfill`.

- [ ] **Step 1: Capture a fixture and inspect the pagination scheme**

```bash
UA="engineer-blog-aggregator/1.0 (+https://github.com/RulerChen/engineer-blog)"
curl -sL -A "$UA" "https://developers.googleblog.com/" -o scraper/tests/fixtures/google-archive.html
wc -c scraper/tests/fixtures/google-archive.html
```

Open the fixture and identify the post-card container, title link, date element, tag/label links, and the older-posts/pagination link. **Feasibility gate:** if the fixture body contains no post markup (fully JS-rendered listing), Google backfill is not feasible with cheerio — delete this task's fixture, skip Steps 2–4, leave `google.ts` RSS-only, and record the decision in the plan file and commit message (`docs: google backfill not feasible — JS-rendered listing`). The spec requires backfill only "where feasible".

- [ ] **Step 2: Write failing structural tests — `scraper/tests/google-archive.test.ts`**

```ts
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseGoogleArchivePage } from "../sources/google.js";
import { articleErrors } from "../src/validate.js";

const html = await readFile(new URL("./fixtures/google-archive.html", import.meta.url), "utf8");

describe("parseGoogleArchivePage", () => {
  const page = parseGoogleArchivePage(html, "https://developers.googleblog.com/");

  it("extracts a full page of posts", () => {
    expect(page.articles.length).toBeGreaterThanOrEqual(5);
  });

  it("every extracted article passes validation", () => {
    for (const article of page.articles) {
      expect(articleErrors(article)).toEqual([]);
      expect(new URL(article.url).host).toBe("developers.googleblog.com");
      expect(article.source).toBe("google");
    }
  });

  it("finds the next page link (or null on the last page)", () => {
    expect(page.nextUrl === null || page.nextUrl.includes("developers.googleblog.com")).toBe(true);
  });
});
```

Run: `npm run test -w scraper` → FAIL (`parseGoogleArchivePage` not exported).

- [ ] **Step 3: Implement the parser in `scraper/sources/google.ts`**

Replace the file with (adjust selectors to the fixture's actual markup — the shape below mirrors Task 10's Meta parser):

```ts
import * as cheerio from "cheerio";
import type { ArchivePage } from "../src/backfill.js";
import { crawlArchive } from "../src/backfill.js";
import { articleId, normalizeUrl } from "../src/normalize.js";
import { fetchRss } from "../src/rss.js";
import { summarize } from "../src/sanitize.js";
import type { Article, Source } from "../src/types.js";

export function parseGoogleArchivePage(html: string, pageUrl: string): ArchivePage {
  const $ = cheerio.load(html);
  const fetchedAt = new Date().toISOString();
  const articles: Article[] = [];
  // Selector set is fixture-driven: post cards on the archive/listing page.
  $("article, .post, [class*='card']").each((_i, el) => {
    const post = $(el);
    const link = post.find("a[href*='/20'], h2 a, h3 a").first();
    const href = link.attr("href");
    if (!href) return;
    const absolute = new URL(href, pageUrl).toString();
    const datetime =
      post.find("time[datetime]").first().attr("datetime") ??
      post.find("time, .date").first().text().trim();
    articles.push({
      id: articleId(absolute),
      title: link.text().trim() || post.find("h2, h3").first().text().trim(),
      url: normalizeUrl(absolute),
      source: "google",
      publishedAt: datetime ? new Date(datetime).toISOString() : "",
      tags: post
        .find("a[href*='label'], .tag, .label")
        .map((_j, t) => $(t).text().trim())
        .get()
        .filter(Boolean),
      summary: summarize(post.find("p").first().html() ?? ""),
      thumbnail: post.find("img").first().attr("src") ?? null,
      fetchedAt,
    });
  });
  const next = $("a[rel='next'], a.next, a[href*='page=']").first().attr("href");
  return { articles, nextUrl: next ? new URL(next, pageUrl).toString() : null };
}

export const google: Source = {
  id: "google",
  name: "Google Developers",
  fetch: () => fetchRss("https://developers.googleblog.com/feeds/posts/default?alt=rss", "google"),
  backfill: () => crawlArchive("https://developers.googleblog.com/", parseGoogleArchivePage),
};
```

(Keep the feed URL that Task 8 Step 1 verified.)

- [ ] **Step 4: Run tests until green, then all checks**

Run: `npm run test -w scraper && npm run typecheck -w scraper`
Expected: all PASS. Iterate on selectors against the fixture until the structural test passes.

- [ ] **Step 5: Commit**

```bash
git add scraper/sources/google.ts scraper/tests/google-archive.test.ts scraper/tests/fixtures/google-archive.html
git commit -m "feat(scraper): google archive backfill scraper"
```

---

### Task 12: Uber archive backfill scraper

**Files:**

- Modify: `scraper/sources/uber.ts`
- Create (captured): `scraper/tests/fixtures/uber-archive.html`
- Test: `scraper/tests/uber-archive.test.ts`

**Interfaces:**

- Consumes: `crawlArchive`/`ArchivePage` (Task 10), `articleId`/`normalizeUrl`/`summarize` (Task 3), `fetchRss` (Task 6), `articleErrors` (Task 4).
- Produces: `parseUberArchivePage(html: string, pageUrl: string): ArchivePage` exported from `scraper/sources/uber.ts`, wired as `uber.backfill`.

This task is the same fixture-first procedure as Task 11, applied to Uber. It is deliberately spelled out in full — do not assume you have read Task 11.

- [ ] **Step 1: Capture a fixture and check feasibility**

```bash
UA="engineer-blog-aggregator/1.0 (+https://github.com/RulerChen/engineer-blog)"
curl -sL -A "$UA" "https://www.uber.com/blog/engineering/page/2/" -o scraper/tests/fixtures/uber-archive.html
wc -c scraper/tests/fixtures/uber-archive.html
```

Open the fixture and identify the post container, title link, date, and next-page link. **Feasibility gate:** uber.com is a heavily client-rendered site — if the fixture contains no server-rendered post markup (search the file for `/blog/` links; none inside list items ⇒ JS-rendered), Uber backfill is not feasible with cheerio: delete the fixture, skip Steps 2–4, leave `uber.ts` RSS-only, and record the decision in the plan file and commit message (`docs: uber backfill not feasible — JS-rendered listing`).

- [ ] **Step 2: Write failing structural tests — `scraper/tests/uber-archive.test.ts`**

```ts
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseUberArchivePage } from "../sources/uber.js";
import { articleErrors } from "../src/validate.js";

const html = await readFile(new URL("./fixtures/uber-archive.html", import.meta.url), "utf8");

describe("parseUberArchivePage", () => {
  const page = parseUberArchivePage(html, "https://www.uber.com/blog/engineering/page/2/");

  it("extracts a full page of posts", () => {
    expect(page.articles.length).toBeGreaterThanOrEqual(5);
  });

  it("every extracted article passes validation", () => {
    for (const article of page.articles) {
      expect(articleErrors(article)).toEqual([]);
      expect(new URL(article.url).host).toBe("www.uber.com");
      expect(article.source).toBe("uber");
    }
  });

  it("finds the next page link (or null on the last page)", () => {
    expect(page.nextUrl === null || page.nextUrl.includes("uber.com")).toBe(true);
  });
});
```

Run: `npm run test -w scraper` → FAIL (`parseUberArchivePage` not exported).

- [ ] **Step 3: Implement the parser in `scraper/sources/uber.ts`**

Replace the file with (adjust selectors to the fixture's actual markup):

```ts
import * as cheerio from "cheerio";
import type { ArchivePage } from "../src/backfill.js";
import { crawlArchive } from "../src/backfill.js";
import { articleId, normalizeUrl } from "../src/normalize.js";
import { fetchRss } from "../src/rss.js";
import { summarize } from "../src/sanitize.js";
import type { Article, Source } from "../src/types.js";

export function parseUberArchivePage(html: string, pageUrl: string): ArchivePage {
  const $ = cheerio.load(html);
  const fetchedAt = new Date().toISOString();
  const articles: Article[] = [];
  $("article, li, [data-baseweb='card']").each((_i, el) => {
    const post = $(el);
    const link = post.find("a[href*='/blog/']").first();
    const href = link.attr("href");
    if (!href || href.includes("/page/")) return;
    const absolute = new URL(href, pageUrl).toString();
    const title = (post.find("h2, h3").first().text() || link.text()).trim();
    if (!title) return;
    const datetime =
      post.find("time[datetime]").first().attr("datetime") ??
      post.find("time, .date, p:contains('/')").first().text().trim();
    articles.push({
      id: articleId(absolute),
      title,
      url: normalizeUrl(absolute),
      source: "uber",
      publishedAt: datetime ? new Date(datetime).toISOString() : "",
      tags: [],
      summary: summarize(post.find("p").first().html() ?? ""),
      thumbnail: post.find("img").first().attr("src") ?? null,
      fetchedAt,
    });
  });
  const next = $("a[rel='next'], a[href*='/page/']").last().attr("href");
  return { articles, nextUrl: next ? new URL(next, pageUrl).toString() : null };
}

export const uber: Source = {
  id: "uber",
  name: "Uber Engineering",
  fetch: () => fetchRss("https://www.uber.com/blog/engineering/rss/", "uber"),
  backfill: () => crawlArchive("https://www.uber.com/blog/engineering/", parseUberArchivePage),
};
```

(Keep the feed URL that Task 8 Step 1 verified. Dedup of a `nextUrl` that revisits pages is harmless — merge dedups by id.)

- [ ] **Step 4: Run tests until green, then all checks**

Run: `npm run test -w scraper && npm run typecheck -w scraper && npm run lint`
Expected: all PASS, clean.

- [ ] **Step 5: Commit**

```bash
git add scraper/sources/uber.ts scraper/tests/uber-archive.test.ts scraper/tests/fixtures/uber-archive.html
git commit -m "feat(scraper): uber archive backfill scraper"
```

---

### Task 13: Frontend scaffold (Vite 8 + Vue 3 + Vitest)

**Files:**

- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.ts`
- Create: `frontend/src/style.css`
- Create: `frontend/src/App.vue` (shell only; fleshed out in Task 20)
- Create: `frontend/src/types.ts`
- Create: `frontend/src/lib/sources.ts`
- Test: `frontend/tests/app.test.ts`

**Interfaces:**

- Consumes: root workspace (Task 1).
- Produces: `Article` interface in `frontend/src/types.ts` (identical to `scraper/src/types.ts`); `sourceNames: Record<string, string>` in `frontend/src/lib/sources.ts`; scripts `dev`, `build`, `test`, `typecheck`, `merge-data` (added in Task 14); Vite `base: "/engineer-blog/"`. All frontend tasks build on this.

- [ ] **Step 1: Create `frontend/package.json`**

```json
{
  "name": "frontend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "vue-tsc --noEmit"
  }
}
```

- [ ] **Step 2: Install frontend dependencies**

Run (from repo root):
`npm install -w frontend vue && npm install -w frontend -D vite@^8 @vitejs/plugin-vue typescript vue-tsc vitest @vue/test-utils happy-dom tsx`
Expected: succeeds; Vite resolves to 8.x. If `@vitejs/plugin-vue` peer-conflicts with Vite 8, install the plugin major that declares Vite 8 support (check `npm view @vitejs/plugin-vue peerDependencies`).

- [ ] **Step 3: Create `frontend/vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/engineer-blog/",
  plugins: [vue()],
  test: {
    environment: "happy-dom",
  },
});
```

- [ ] **Step 4: Create `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "jsx": "preserve",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"]
  },
  "include": ["src", "tests", "scripts", "vite.config.ts"]
}
```

- [ ] **Step 5: Create `frontend/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Engineer Blog Aggregator</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `frontend/src/types.ts`**

```ts
// Keep in sync with scraper/src/types.ts (single source of truth for the data shape).
export interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string; // ISO 8601
  tags: string[];
  summary: string;
  thumbnail: string | null;
  fetchedAt: string; // ISO 8601
}
```

- [ ] **Step 7: Create `frontend/src/lib/sources.ts`**

```ts
/** Source id → display name shown on company badges and filters. */
export const sourceNames: Record<string, string> = {
  google: "Google Developers",
  meta: "Meta Engineering",
  netflix: "Netflix Tech Blog",
  uber: "Uber Engineering",
  airbnb: "Airbnb Engineering",
};

export function sourceName(id: string): string {
  return sourceNames[id] ?? id;
}
```

- [ ] **Step 8: Create `frontend/src/main.ts`, `frontend/src/style.css`, and the App shell**

`frontend/src/main.ts`:

```ts
import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";

createApp(App).mount("#app");
```

`frontend/src/style.css` (final version — later tasks add components that use these classes):

```css
:root {
  --border: #e2e2e2;
  --muted: #6b7280;
  --accent: #2563eb;
  --badge-bg: #eef2ff;
  font-family:
    system-ui,
    -apple-system,
    "Segoe UI",
    sans-serif;
  color: #111827;
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  background: #f9fafb;
}
a {
  color: var(--accent);
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}
.container {
  max-width: 960px;
  margin: 0 auto;
  padding: 1rem;
}
.site-header h1 {
  margin: 0.5rem 0 0.25rem;
}
.stats {
  color: var(--muted);
  font-size: 0.9rem;
  margin-bottom: 1rem;
}
.layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 1.5rem;
}
@media (max-width: 720px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
.search-bar input {
  width: 100%;
  padding: 0.6rem 0.8rem;
  font-size: 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 1rem;
}
.filter-panel {
  font-size: 0.9rem;
}
.filter-panel h3 {
  margin: 1rem 0 0.4rem;
  font-size: 0.85rem;
  text-transform: uppercase;
  color: var(--muted);
}
.filter-panel label {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  padding: 0.15rem 0;
  cursor: pointer;
}
.filter-panel .count {
  color: var(--muted);
  margin-left: auto;
}
.filter-panel input[type="date"] {
  width: 100%;
  margin-top: 0.25rem;
}
.article-card {
  display: flex;
  gap: 1rem;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 0.75rem;
}
.article-card img.thumb {
  width: 120px;
  height: 80px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
}
.article-card h2 {
  margin: 0 0 0.3rem;
  font-size: 1.05rem;
}
.article-card .meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.8rem;
  color: var(--muted);
}
.badge {
  background: var(--badge-bg);
  color: var(--accent);
  border-radius: 999px;
  padding: 0.1rem 0.6rem;
  font-weight: 600;
}
.badge.new {
  background: #dcfce7;
  color: #15803d;
}
.tag {
  background: #f3f4f6;
  border-radius: 4px;
  padding: 0.05rem 0.4rem;
}
.summary {
  margin: 0.4rem 0 0;
  font-size: 0.9rem;
  color: #374151;
}
.load-more {
  display: block;
  margin: 1rem auto 2rem;
  padding: 0.6rem 1.5rem;
  font-size: 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}
.load-more:hover {
  background: #f3f4f6;
}
.empty,
.loading,
.error {
  text-align: center;
  color: var(--muted);
  padding: 3rem 0;
}
```

`frontend/src/App.vue` (shell; replaced in Task 20):

```vue
<script setup lang="ts">
const title = "Engineer Blog Aggregator";
</script>

<template>
  <div class="container">
    <header class="site-header">
      <h1>{{ title }}</h1>
    </header>
  </div>
</template>
```

- [ ] **Step 9: Write the scaffold smoke test — `frontend/tests/app.test.ts`**

```ts
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import App from "../src/App.vue";

describe("App", () => {
  it("renders the site title", () => {
    const wrapper = mount(App);
    expect(wrapper.text()).toContain("Engineer Blog Aggregator");
  });
});
```

Note: Task 20 replaces App.vue and extends this test; the mount here also needs a fetch stub from then on.

- [ ] **Step 10: Verify everything runs**

Run: `npm run test -w frontend && npm run typecheck -w frontend && npm run build -w frontend && npm run lint && npm run format`
Expected: test PASS, typecheck clean, `frontend/dist/` produced with assets under `/engineer-blog/` base, lint/format clean.

- [ ] **Step 11: Commit**

```bash
git add frontend package.json package-lock.json
git commit -m "feat(frontend): vite 8 + vue 3 scaffold with pages base path"
```

---

### Task 14: Data merge build script

**Files:**

- Create: `frontend/scripts/mergeArticles.ts`
- Modify: `frontend/package.json` (add `merge-data` + `prebuild` scripts)
- Test: `frontend/tests/mergeArticles.test.ts`

**Interfaces:**

- Consumes: `Article` (`frontend/src/types.ts`, Task 13); reads `data/articles/*.json` produced by Task 9.
- Produces: `mergeArticleFiles(perSource: Article[][]): Article[]` (flatten + sort newest-first); running `npm run merge-data -w frontend` writes `frontend/public/articles.json` (gitignored since Task 1). `npm run build -w frontend` runs it automatically via `prebuild`. The deploy workflow (Task 23) and local dev rely on this.

- [ ] **Step 1: Write failing tests — `frontend/tests/mergeArticles.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { mergeArticleFiles } from "../scripts/mergeArticles.js";
import type { Article } from "../src/types.js";

function makeArticle(id: string, publishedAt: string, source: string): Article {
  return {
    id,
    title: id,
    url: `https://example.com/${id}`,
    source,
    publishedAt,
    tags: [],
    summary: "",
    thumbnail: null,
    fetchedAt: publishedAt,
  };
}

describe("mergeArticleFiles", () => {
  it("flattens all sources and sorts newest-first", () => {
    const google = [makeArticle("g1", "2026-07-01T00:00:00.000Z", "google")];
    const meta = [
      makeArticle("m1", "2026-07-10T00:00:00.000Z", "meta"),
      makeArticle("m2", "2026-06-01T00:00:00.000Z", "meta"),
    ];
    expect(mergeArticleFiles([google, meta]).map((a) => a.id)).toEqual(["m1", "g1", "m2"]);
  });

  it("handles empty inputs", () => {
    expect(mergeArticleFiles([])).toEqual([]);
    expect(mergeArticleFiles([[], []])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -w frontend`
Expected: FAIL — cannot resolve `../scripts/mergeArticles.js`.

- [ ] **Step 3: Implement `frontend/scripts/mergeArticles.ts`**

```ts
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Article } from "../src/types.js";

export function mergeArticleFiles(perSource: Article[][]): Article[] {
  return perSource.flat().sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

async function main(): Promise<void> {
  const dataDir = fileURLToPath(new URL("../../data/articles/", import.meta.url));
  const outDir = fileURLToPath(new URL("../public/", import.meta.url));
  const files = (await readdir(dataDir)).filter((f) => f.endsWith(".json"));
  const perSource = await Promise.all(
    files.map(async (f) => JSON.parse(await readFile(join(dataDir, f), "utf8")) as Article[]),
  );
  const merged = mergeArticleFiles(perSource);
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "articles.json"), JSON.stringify(merged), "utf8");
  console.log(`wrote ${merged.length} articles from ${files.length} source files`);
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href
) {
  await main();
}
```

If the entry-point guard proves brittle under `tsx` on the CI runner, simplify it to an unconditional `await main()` and move `mergeArticleFiles` into `frontend/src/lib/mergeArticles.ts` so the test imports never execute `main()` — the exported signature must not change.

- [ ] **Step 4: Add the scripts to `frontend/package.json`**

In `"scripts"`, add:

```json
"merge-data": "tsx scripts/mergeArticles.ts",
"prebuild": "tsx scripts/mergeArticles.ts"
```

- [ ] **Step 5: Run tests and the real script**

Run: `npm run test -w frontend && npm run merge-data -w frontend`
Expected: tests PASS; script prints `wrote N articles from 5 source files` (N > 0 from Task 9's seed); `frontend/public/articles.json` exists and `git status` does NOT list it (gitignored).

- [ ] **Step 6: Commit**

```bash
git add frontend/scripts/mergeArticles.ts frontend/tests/mergeArticles.test.ts frontend/package.json
git commit -m "feat(frontend): merge data/articles into single articles.json at build time"
```

---

### Task 15: Pure filter/search functions

**Files:**

- Create: `frontend/src/lib/filter.ts`
- Test: `frontend/tests/filter.test.ts`

**Interfaces:**

- Consumes: `Article` (Task 13).
- Produces (all pure; Tasks 16–20 consume these exact names):
  - `type DatePreset = "all" | "week" | "month" | "year" | "custom"`
  - `interface FilterState { query: string; companies: string[]; tags: string[]; datePreset: DatePreset; dateFrom: string | null; dateTo: string | null }`
  - `emptyFilter(): FilterState`
  - `applyFilters(articles: Article[], state: FilterState, now?: Date): Article[]`
  - `companyCounts(articles: Article[]): { id: string; count: number }[]` (count desc, then id asc)
  - `topTags(articles: Article[], limit?: number): { tag: string; count: number }[]` (default limit 30; count desc, then tag asc)
  - `isNew(article: Article, now?: Date): boolean` (fetchedAt within last 24 h)

- [ ] **Step 1: Write failing tests — `frontend/tests/filter.test.ts`**

```ts
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
    thumbnail: null,
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -w frontend`
Expected: FAIL — cannot resolve `../src/lib/filter.js`.

- [ ] **Step 3: Implement `frontend/src/lib/filter.ts`**

```ts
import type { Article } from "../types.js";

export type DatePreset = "all" | "week" | "month" | "year" | "custom";

export interface FilterState {
  query: string;
  companies: string[];
  tags: string[];
  datePreset: DatePreset;
  dateFrom: string | null; // YYYY-MM-DD, custom preset only
  dateTo: string | null; // YYYY-MM-DD, custom preset only
}

export function emptyFilter(): FilterState {
  return { query: "", companies: [], tags: [], datePreset: "all", dateFrom: null, dateTo: null };
}

const DAY_MS = 86_400_000;

function dateRange(state: FilterState, now: Date): { from: number; to: number } {
  switch (state.datePreset) {
    case "all":
      return { from: -Infinity, to: Infinity };
    case "week":
      return { from: now.getTime() - 7 * DAY_MS, to: Infinity };
    case "month":
      return { from: now.getTime() - 30 * DAY_MS, to: Infinity };
    case "year":
      return { from: now.getTime() - 365 * DAY_MS, to: Infinity };
    case "custom":
      return {
        from: state.dateFrom ? Date.parse(`${state.dateFrom}T00:00:00.000Z`) : -Infinity,
        // inclusive end day: anything before the *next* day counts
        to: state.dateTo ? Date.parse(`${state.dateTo}T00:00:00.000Z`) + DAY_MS : Infinity,
      };
  }
}

export function applyFilters(articles: Article[], state: FilterState, now = new Date()): Article[] {
  const { from, to } = dateRange(state, now);
  const companies = new Set(state.companies);
  const tags = new Set(state.tags);
  const query = state.query.trim().toLowerCase();
  return articles.filter((article) => {
    if (companies.size > 0 && !companies.has(article.source)) return false;
    if (tags.size > 0 && !article.tags.some((tag) => tags.has(tag))) return false;
    const published = Date.parse(article.publishedAt);
    if (published < from || published >= to) return false;
    if (
      query &&
      !article.title.toLowerCase().includes(query) &&
      !article.summary.toLowerCase().includes(query)
    ) {
      return false;
    }
    return true;
  });
}

function countBy(keys: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return counts;
}

export function companyCounts(articles: Article[]): { id: string; count: number }[] {
  return [...countBy(articles.map((a) => a.source))]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
}

export function topTags(articles: Article[], limit = 30): { tag: string; count: number }[] {
  return [...countBy(articles.flatMap((a) => a.tags))]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}

export function isNew(article: Article, now = new Date()): boolean {
  return now.getTime() - Date.parse(article.fetchedAt) < DAY_MS;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -w frontend`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/filter.ts frontend/tests/filter.test.ts
git commit -m "feat(frontend): pure search/filter functions with date presets"
```

---

### Task 16: URL state round-tripping

**Files:**

- Create: `frontend/src/lib/urlState.ts`
- Test: `frontend/tests/urlState.test.ts`

**Interfaces:**

- Consumes: `FilterState`, `DatePreset`, `emptyFilter` (Task 15).
- Produces: `stateToQuery(state: FilterState): string` (no leading `?`; empty string when nothing is set) and `queryToState(search: string): FilterState` (accepts with or without leading `?`; unknown values fall back to defaults). Task 17's composable uses both.

- [ ] **Step 1: Write failing tests — `frontend/tests/urlState.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { emptyFilter, type FilterState } from "../src/lib/filter.js";
import { queryToState, stateToQuery } from "../src/lib/urlState.js";

describe("stateToQuery", () => {
  it("serializes only non-default fields", () => {
    expect(stateToQuery(emptyFilter())).toBe("");
    expect(stateToQuery({ ...emptyFilter(), query: "graphql" })).toBe("q=graphql");
  });
  it("serializes companies, tags, and presets", () => {
    const state: FilterState = {
      query: "k8s",
      companies: ["meta", "google"],
      tags: ["ml", "infra"],
      datePreset: "month",
      dateFrom: null,
      dateTo: null,
    };
    const params = new URLSearchParams(stateToQuery(state));
    expect(params.get("q")).toBe("k8s");
    expect(params.get("companies")).toBe("meta,google");
    expect(params.get("tags")).toBe("ml,infra");
    expect(params.get("date")).toBe("month");
  });
  it("serializes custom range dates", () => {
    const state: FilterState = {
      ...emptyFilter(),
      datePreset: "custom",
      dateFrom: "2026-01-01",
      dateTo: "2026-07-01",
    };
    const params = new URLSearchParams(stateToQuery(state));
    expect(params.get("date")).toBe("custom");
    expect(params.get("from")).toBe("2026-01-01");
    expect(params.get("to")).toBe("2026-07-01");
  });
});

describe("queryToState", () => {
  it("round-trips every field", () => {
    const state: FilterState = {
      query: "search text",
      companies: ["uber"],
      tags: ["mobile"],
      datePreset: "custom",
      dateFrom: "2026-01-01",
      dateTo: null,
    };
    expect(queryToState(stateToQuery(state))).toEqual(state);
  });
  it("accepts a leading question mark", () => {
    expect(queryToState("?q=x").query).toBe("x");
  });
  it("falls back to defaults for garbage input", () => {
    expect(queryToState("date=bogus&companies=")).toEqual(emptyFilter());
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -w frontend`
Expected: FAIL — cannot resolve `../src/lib/urlState.js`.

- [ ] **Step 3: Implement `frontend/src/lib/urlState.ts`**

```ts
import { type DatePreset, type FilterState, emptyFilter } from "./filter.js";

const PRESETS: DatePreset[] = ["all", "week", "month", "year", "custom"];

export function stateToQuery(state: FilterState): string {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.companies.length > 0) params.set("companies", state.companies.join(","));
  if (state.tags.length > 0) params.set("tags", state.tags.join(","));
  if (state.datePreset !== "all") params.set("date", state.datePreset);
  if (state.datePreset === "custom") {
    if (state.dateFrom) params.set("from", state.dateFrom);
    if (state.dateTo) params.set("to", state.dateTo);
  }
  return params.toString();
}

export function queryToState(search: string): FilterState {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const rawPreset = params.get("date");
  const datePreset = PRESETS.includes(rawPreset as DatePreset) ? (rawPreset as DatePreset) : "all";
  const list = (key: string) => params.get(key)?.split(",").filter(Boolean) ?? [];
  return {
    ...emptyFilter(),
    query: params.get("q") ?? "",
    companies: list("companies"),
    tags: list("tags"),
    datePreset,
    dateFrom: datePreset === "custom" ? params.get("from") : null,
    dateTo: datePreset === "custom" ? params.get("to") : null,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -w frontend`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/urlState.ts frontend/tests/urlState.test.ts
git commit -m "feat(frontend): filter state url query round-tripping"
```

---

### Task 17: useArticleFilter composable

**Files:**

- Create: `frontend/src/composables/useArticleFilter.ts`
- Test: `frontend/tests/useArticleFilter.test.ts`

**Interfaces:**

- Consumes: `applyFilters`, `companyCounts`, `topTags`, `emptyFilter`, `FilterState` (Task 15); `queryToState`, `stateToQuery` (Task 16); Vue reactivity.
- Produces: `useArticleFilter(articles: Ref<Article[]>): { state: FilterState (reactive); filtered: ComputedRef<Article[]>; companies: ComputedRef<{id: string; count: number}[]>; tags: ComputedRef<{tag: string; count: number}[]> }`. Initializes `state` from `window.location.search`; syncs every state change back to the URL via `history.replaceState`. Task 20's App consumes this.

- [ ] **Step 1: Write failing tests — `frontend/tests/useArticleFilter.test.ts`**

```ts
import { nextTick, ref } from "vue";
import { beforeEach, describe, expect, it } from "vitest";
import { useArticleFilter } from "../src/composables/useArticleFilter.js";
import type { Article } from "../src/types.js";

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: Math.random().toString(36).slice(2),
    title: "A post",
    url: "https://example.com/post",
    source: "google",
    publishedAt: "2026-07-10T00:00:00.000Z",
    tags: ["ml"],
    summary: "",
    thumbnail: null,
    fetchedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  history.replaceState(null, "", "/");
});

describe("useArticleFilter", () => {
  it("filters reactively when state changes", async () => {
    const articles = ref([makeArticle({ title: "GraphQL" }), makeArticle({ title: "Rust" })]);
    const { state, filtered } = useArticleFilter(articles);
    expect(filtered.value).toHaveLength(2);
    state.query = "rust";
    await nextTick();
    expect(filtered.value).toHaveLength(1);
    expect(filtered.value[0].title).toBe("Rust");
  });

  it("exposes company and tag options with counts", () => {
    const articles = ref([
      makeArticle({ source: "meta", tags: ["infra"] }),
      makeArticle({ source: "meta", tags: ["infra", "ml"] }),
    ]);
    const { companies, tags } = useArticleFilter(articles);
    expect(companies.value).toEqual([{ id: "meta", count: 2 }]);
    expect(tags.value[0]).toEqual({ tag: "infra", count: 2 });
  });

  it("initializes state from the URL", () => {
    history.replaceState(null, "", "/?q=k8s&companies=uber");
    const { state } = useArticleFilter(ref<Article[]>([]));
    expect(state.query).toBe("k8s");
    expect(state.companies).toEqual(["uber"]);
  });

  it("writes state changes back to the URL", async () => {
    const { state } = useArticleFilter(ref<Article[]>([]));
    state.query = "wasm";
    state.companies = ["meta"];
    await nextTick();
    const params = new URLSearchParams(window.location.search);
    expect(params.get("q")).toBe("wasm");
    expect(params.get("companies")).toBe("meta");
  });

  it("clears the query string when state returns to defaults", async () => {
    history.replaceState(null, "", "/?q=k8s");
    const { state } = useArticleFilter(ref<Article[]>([]));
    state.query = "";
    await nextTick();
    expect(window.location.search).toBe("");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -w frontend`
Expected: FAIL — cannot resolve the composable module.

- [ ] **Step 3: Implement `frontend/src/composables/useArticleFilter.ts`**

```ts
import { computed, reactive, watch, type ComputedRef, type Ref } from "vue";
import { applyFilters, companyCounts, topTags, type FilterState } from "../lib/filter.js";
import { queryToState, stateToQuery } from "../lib/urlState.js";
import type { Article } from "../types.js";

export interface ArticleFilter {
  state: FilterState;
  filtered: ComputedRef<Article[]>;
  companies: ComputedRef<{ id: string; count: number }[]>;
  tags: ComputedRef<{ tag: string; count: number }[]>;
}

/** Search + filters over the full dataset, kept in sync with the URL query string. */
export function useArticleFilter(articles: Ref<Article[]>): ArticleFilter {
  const state = reactive<FilterState>(queryToState(window.location.search));

  watch(state, () => {
    const query = stateToQuery(state);
    history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  });

  return {
    state,
    filtered: computed(() => applyFilters(articles.value, state)),
    companies: computed(() => companyCounts(articles.value)),
    tags: computed(() => topTags(articles.value)),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -w frontend`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/composables/useArticleFilter.ts frontend/tests/useArticleFilter.test.ts
git commit -m "feat(frontend): useArticleFilter composable with url sync"
```

---

### Task 18: ArticleCard + ArticleList components

**Files:**

- Create: `frontend/src/components/ArticleCard.vue`
- Create: `frontend/src/components/ArticleList.vue`
- Test: `frontend/tests/articleList.test.ts`

**Interfaces:**

- Consumes: `Article` (Task 13), `sourceName` (Task 13), `isNew` (Task 15), CSS classes from `style.css` (Task 13).
- Produces: `ArticleCard` (prop: `article: Article`) and `ArticleList` (prop: `articles: Article[]`; renders cards newest-first as given, with "Load more" pagination of 30). Task 20 mounts `ArticleList`.

- [ ] **Step 1: Write the failing smoke test — `frontend/tests/articleList.test.ts`**

This is the spec's required component smoke test: the list renders from sample data.

```ts
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ArticleList from "../src/components/ArticleList.vue";
import type { Article } from "../src/types.js";

function makeArticle(n: number, overrides: Partial<Article> = {}): Article {
  return {
    id: `id-${n}`,
    title: `Post number ${n}`,
    url: `https://example.com/${n}`,
    source: "meta",
    publishedAt: "2026-07-10T00:00:00.000Z",
    tags: ["infra"],
    summary: `Summary ${n}`,
    thumbnail: null,
    fetchedAt: new Date().toISOString(), // within 24h → New badge
    ...overrides,
  };
}

describe("ArticleList", () => {
  it("renders cards from sample data", () => {
    const wrapper = mount(ArticleList, {
      props: { articles: [makeArticle(1), makeArticle(2)] },
    });
    expect(wrapper.text()).toContain("Post number 1");
    expect(wrapper.text()).toContain("Post number 2");
    expect(wrapper.text()).toContain("Meta Engineering"); // company badge
    expect(wrapper.text()).toContain("New"); // fetchedAt within 24h
    const link = wrapper.find("a.title-link");
    expect(link.attributes("href")).toBe("https://example.com/1");
    expect(link.attributes("target")).toBe("_blank");
  });

  it("paginates with Load more (30 per page)", async () => {
    const articles = Array.from({ length: 45 }, (_v, i) => makeArticle(i));
    const wrapper = mount(ArticleList, { props: { articles } });
    expect(wrapper.findAll(".article-card")).toHaveLength(30);
    await wrapper.find("button.load-more").trigger("click");
    expect(wrapper.findAll(".article-card")).toHaveLength(45);
    expect(wrapper.find("button.load-more").exists()).toBe(false);
  });

  it("shows an empty state when there are no matches", () => {
    const wrapper = mount(ArticleList, { props: { articles: [] } });
    expect(wrapper.find(".empty").text()).toContain("No articles match");
  });

  it("resets pagination when the article set changes", async () => {
    const articles = Array.from({ length: 45 }, (_v, i) => makeArticle(i));
    const wrapper = mount(ArticleList, { props: { articles } });
    await wrapper.find("button.load-more").trigger("click");
    await wrapper.setProps({ articles: articles.slice(0, 40) });
    expect(wrapper.findAll(".article-card")).toHaveLength(30);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -w frontend`
Expected: FAIL — cannot resolve the component modules.

- [ ] **Step 3: Implement `frontend/src/components/ArticleCard.vue`**

```vue
<script setup lang="ts">
import { computed } from "vue";
import { isNew } from "../lib/filter.js";
import { sourceName } from "../lib/sources.js";
import type { Article } from "../types.js";

const props = defineProps<{ article: Article }>();

const displayDate = computed(() =>
  new Date(props.article.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }),
);
</script>

<template>
  <article class="article-card">
    <img v-if="article.thumbnail" class="thumb" :src="article.thumbnail" alt="" loading="lazy" />
    <div>
      <h2>
        <a class="title-link" :href="article.url" target="_blank" rel="noopener noreferrer">
          {{ article.title }}
        </a>
      </h2>
      <div class="meta">
        <span class="badge">{{ sourceName(article.source) }}</span>
        <span v-if="isNew(article)" class="badge new">New</span>
        <time :datetime="article.publishedAt">{{ displayDate }}</time>
        <span v-for="tag in article.tags" :key="tag" class="tag">{{ tag }}</span>
      </div>
      <p v-if="article.summary" class="summary">{{ article.summary }}</p>
    </div>
  </article>
</template>
```

- [ ] **Step 4: Implement `frontend/src/components/ArticleList.vue`**

```vue
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Article } from "../types.js";
import ArticleCard from "./ArticleCard.vue";

const props = defineProps<{ articles: Article[] }>();

const PAGE_SIZE = 30;
const visibleCount = ref(PAGE_SIZE);

watch(
  () => props.articles,
  () => {
    visibleCount.value = PAGE_SIZE;
  },
);

const visible = computed(() => props.articles.slice(0, visibleCount.value));
const hasMore = computed(() => visibleCount.value < props.articles.length);
</script>

<template>
  <div>
    <p v-if="articles.length === 0" class="empty">No articles match your filters.</p>
    <template v-else>
      <ArticleCard v-for="article in visible" :key="article.id" :article="article" />
      <button v-if="hasMore" class="load-more" @click="visibleCount += PAGE_SIZE">
        Load more ({{ articles.length - visibleCount }} remaining)
      </button>
    </template>
  </div>
</template>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -w frontend`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ArticleCard.vue frontend/src/components/ArticleList.vue frontend/tests/articleList.test.ts
git commit -m "feat(frontend): article card and paginated article list"
```

---

### Task 19: SearchBar + FilterPanel components

**Files:**

- Create: `frontend/src/components/SearchBar.vue`
- Create: `frontend/src/components/FilterPanel.vue`
- Test: `frontend/tests/searchBar.test.ts`

**Interfaces:**

- Consumes: `FilterState`, `DatePreset` (Task 15), `sourceName` (Task 13).
- Produces:
  - `SearchBar` — prop `modelValue: string`, emits `update:modelValue` debounced by 200 ms (`v-model` compatible).
  - `FilterPanel` — props `state: FilterState` (mutated directly — it's the composable's reactive object), `companies: { id: string; count: number }[]`, `tags: { tag: string; count: number }[]`.
  - Task 20 mounts both.

- [ ] **Step 1: Write failing debounce tests — `frontend/tests/searchBar.test.ts`**

```ts
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SearchBar from "../src/components/SearchBar.vue";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("SearchBar", () => {
  it("debounces input before emitting update:modelValue", async () => {
    const wrapper = mount(SearchBar, { props: { modelValue: "" } });
    await wrapper.find("input").setValue("k8s");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    vi.advanceTimersByTime(200);
    expect(wrapper.emitted("update:modelValue")).toEqual([["k8s"]]);
  });

  it("only emits the final value of a burst", async () => {
    const wrapper = mount(SearchBar, { props: { modelValue: "" } });
    await wrapper.find("input").setValue("k");
    vi.advanceTimersByTime(100);
    await wrapper.find("input").setValue("k8s");
    vi.advanceTimersByTime(200);
    expect(wrapper.emitted("update:modelValue")).toEqual([["k8s"]]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -w frontend`
Expected: FAIL — cannot resolve `SearchBar.vue`.

- [ ] **Step 3: Implement `frontend/src/components/SearchBar.vue`**

```vue
<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const draft = ref(props.modelValue);
watch(
  () => props.modelValue,
  (value) => {
    draft.value = value;
  },
);

let timer: ReturnType<typeof setTimeout> | undefined;
function onInput(): void {
  clearTimeout(timer);
  timer = setTimeout(() => emit("update:modelValue", draft.value), 200);
}
onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <div class="search-bar">
    <input
      v-model="draft"
      type="search"
      placeholder="Search titles and summaries…"
      aria-label="Search articles"
      @input="onInput"
    />
  </div>
</template>
```

- [ ] **Step 4: Implement `frontend/src/components/FilterPanel.vue`**

No dedicated unit test (per spec's lean test list — the logic it drives is fully covered by Tasks 15–17); it is exercised by Task 20's smoke test.

```vue
<script setup lang="ts">
import type { DatePreset, FilterState } from "../lib/filter.js";
import { sourceName } from "../lib/sources.js";

defineProps<{
  state: FilterState;
  companies: { id: string; count: number }[];
  tags: { tag: string; count: number }[];
}>();

const presets: { value: DatePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "week", label: "Last week" },
  { value: "month", label: "Last month" },
  { value: "year", label: "Last year" },
  { value: "custom", label: "Custom range" },
];
</script>

<template>
  <aside class="filter-panel">
    <h3>Company</h3>
    <label v-for="company in companies" :key="company.id">
      <input v-model="state.companies" type="checkbox" :value="company.id" />
      {{ sourceName(company.id) }}
      <span class="count">{{ company.count }}</span>
    </label>

    <h3>Tags</h3>
    <label v-for="tag in tags" :key="tag.tag">
      <input v-model="state.tags" type="checkbox" :value="tag.tag" />
      {{ tag.tag }}
      <span class="count">{{ tag.count }}</span>
    </label>

    <h3>Published</h3>
    <label v-for="preset in presets" :key="preset.value">
      <input v-model="state.datePreset" type="radio" :value="preset.value" />
      {{ preset.label }}
    </label>
    <template v-if="state.datePreset === 'custom'">
      <input
        type="date"
        aria-label="From date"
        :value="state.dateFrom ?? ''"
        @change="state.dateFrom = ($event.target as HTMLInputElement).value || null"
      />
      <input
        type="date"
        aria-label="To date"
        :value="state.dateTo ?? ''"
        @change="state.dateTo = ($event.target as HTMLInputElement).value || null"
      />
    </template>
  </aside>
</template>
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npm run test -w frontend && npm run typecheck -w frontend`
Expected: all PASS, typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/SearchBar.vue frontend/src/components/FilterPanel.vue frontend/tests/searchBar.test.ts
git commit -m "feat(frontend): debounced search bar and filter panel"
```

---

### Task 20: App integration — data load, stats header, wiring

**Files:**

- Modify: `frontend/src/App.vue` (replace the Task 13 shell)
- Modify: `frontend/tests/app.test.ts` (extend)

**Interfaces:**

- Consumes: `useArticleFilter` (Task 17), `SearchBar`/`FilterPanel` (Task 19), `ArticleList` (Task 18), `Article` (Task 13).
- Produces: the complete v1 page. Data is fetched once from `${import.meta.env.BASE_URL}articles.json`. Stats line = article count, source count, last-updated (max `fetchedAt`).

- [ ] **Step 1: Extend the failing test — replace `frontend/tests/app.test.ts`**

```ts
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App.vue";
import type { Article } from "../src/types.js";

const articles: Article[] = [
  {
    id: "id-1",
    title: "Streaming at scale",
    url: "https://example.com/streaming",
    source: "netflix",
    publishedAt: "2026-07-10T00:00:00.000Z",
    tags: ["streaming"],
    summary: "How we stream.",
    thumbnail: null,
    fetchedAt: "2026-07-11T00:00:00.000Z",
  },
  {
    id: "id-2",
    title: "Feed ranking",
    url: "https://example.com/ranking",
    source: "meta",
    publishedAt: "2026-07-09T00:00:00.000Z",
    tags: ["ml"],
    summary: "Ranking systems.",
    thumbnail: null,
    fetchedAt: "2026-07-01T00:00:00.000Z",
  },
];

beforeEach(() => {
  history.replaceState(null, "", "/");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(articles), { status: 200 })),
  );
});

describe("App", () => {
  it("loads articles and renders the stats line and list", async () => {
    const wrapper = mount(App);
    await flushPromises();
    expect(wrapper.text()).toContain("Engineer Blog Aggregator");
    expect(wrapper.text()).toContain("2 articles");
    expect(wrapper.text()).toContain("2 sources");
    expect(wrapper.text()).toContain("Streaming at scale");
    expect(wrapper.text()).toContain("Feed ranking");
  });

  it("shows an error state when the fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 })),
    );
    const wrapper = mount(App);
    await flushPromises();
    expect(wrapper.find(".error").exists()).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify the new assertions fail**

Run: `npm run test -w frontend`
Expected: FAIL — the shell App has no stats line or list.

- [ ] **Step 3: Replace `frontend/src/App.vue`**

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import ArticleList from "./components/ArticleList.vue";
import FilterPanel from "./components/FilterPanel.vue";
import SearchBar from "./components/SearchBar.vue";
import { useArticleFilter } from "./composables/useArticleFilter.js";
import type { Article } from "./types.js";

const articles = ref<Article[]>([]);
const loading = ref(true);
const loadError = ref(false);

const { state, filtered, companies, tags } = useArticleFilter(articles);

const stats = computed(() => {
  if (articles.value.length === 0) return "";
  const lastUpdated = articles.value.reduce(
    (max, a) => (a.fetchedAt > max ? a.fetchedAt : max),
    articles.value[0].fetchedAt,
  );
  const date = new Date(lastUpdated).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return `${articles.value.length} articles · ${companies.value.length} sources · updated ${date}`;
});

onMounted(async () => {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}articles.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    articles.value = (await res.json()) as Article[];
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="container">
    <header class="site-header">
      <h1>Engineer Blog Aggregator</h1>
      <p class="stats">{{ stats }}</p>
    </header>

    <p v-if="loading" class="loading">Loading articles…</p>
    <p v-else-if="loadError" class="error">Could not load articles. Try refreshing.</p>
    <div v-else class="layout">
      <FilterPanel :state="state" :companies="companies" :tags="tags" />
      <main>
        <SearchBar v-model="state.query" />
        <ArticleList :articles="filtered" />
      </main>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Run all frontend checks**

Run: `npm run test -w frontend && npm run typecheck -w frontend && npm run lint && npm run format`
Expected: all PASS, clean.

- [ ] **Step 5: Verify in a real browser**

Run: `npm run merge-data -w frontend && npm run dev -w frontend`
Open the printed URL (note the `/engineer-blog/` base). Check: stats line shows real counts; search narrows the list as you type (debounced); company/tag checkboxes and date presets filter; selections appear in the URL query string; reloading the URL restores them; cards link out in a new tab; "Load more" appends. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.vue frontend/tests/app.test.ts
git commit -m "feat(frontend): app integration with data load, stats, and filters"
```

---

### Task 21: CI workflow

**Files:**

- Create: `.github/workflows/ci.yml`

**Interfaces:**

- Consumes: root scripts `lint`, `format`, `typecheck`, `test` (Task 1; workspace scripts from Tasks 2 and 13).
- Produces: quality gate on pushes to `main` and PRs, skipped for data-only commits.

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
    paths-ignore:
      - "data/**"
  pull_request:
    paths-ignore:
      - "data/**"

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - name: Lint
        run: npm run lint
      - name: Format check
        run: npm run format
      - name: Typecheck
        run: npm run typecheck
      - name: Test
        run: npm test
```

- [ ] **Step 2: Validate the workflow file locally**

Run: `npx --yes @action-validator/cli .github/workflows/ci.yml` (or `actionlint` if installed). If neither tool is available, at minimum run `node -e "require('js-yaml')"`-free check: `npx --yes yaml-lint .github/workflows/ci.yml`.
Expected: no syntax errors.

- [ ] **Step 3: Commit and verify on GitHub**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: lint, format, typecheck, and test on push and pr"
git push
```

Then run `gh run watch` (or check the Actions tab): the CI run must complete green. Each check appears as its own step so failures are easy to read.

---

### Task 22: Fetch + backfill workflows

**Files:**

- Create: `.github/workflows/fetch.yml`
- Create: `.github/workflows/backfill.yml`

**Interfaces:**

- Consumes: CLI contract from Task 9 (`npm run fetch -w scraper`, `npm run backfill -w scraper -- <source>`, `added=N` on `$GITHUB_OUTPUT`, summary on `$GITHUB_STEP_SUMMARY`, exit 1 only when all sources fail); a repo secret `FETCH_PUSH_TOKEN` (created in Step 1).
- Produces: daily data commits that trigger the deploy workflow (Task 23).

- [ ] **Step 1: Create the push token (manual, one-time)**

The default `GITHUB_TOKEN` does not trigger downstream workflows, so the data push must use a different token:

1. GitHub → Settings → Developer settings → Fine-grained personal access tokens → Generate new token.
2. Repository access: only `RulerChen/engineer-blog`. Permissions: **Contents: Read and write**.
3. Repo → Settings → Secrets and variables → Actions → New repository secret, name `FETCH_PUSH_TOKEN`.

- [ ] **Step 2: Create `.github/workflows/fetch.yml`**

```yaml
name: Fetch articles

on:
  schedule:
    - cron: "0 2 * * *"
  workflow_dispatch:

concurrency:
  group: data-commits
  cancel-in-progress: false

jobs:
  fetch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.FETCH_PUSH_TOKEN }}
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - name: Run scraper
        id: scrape
        run: npm run fetch -w scraper
      - name: Commit and push new data
        run: |
          if git diff --quiet -- data/; then
            echo "No new articles today."
            exit 0
          fi
          git config user.name "fetch-bot"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/
          git commit -m "data: fetch $(date -u +%F) (+${{ steps.scrape.outputs.added }} articles)"
          git push
```

- [ ] **Step 3: Create `.github/workflows/backfill.yml`**

```yaml
name: Backfill source archive

on:
  workflow_dispatch:
    inputs:
      source:
        description: "Source to backfill"
        required: true
        type: choice
        options:
          - google
          - meta
          - uber

concurrency:
  group: data-commits
  cancel-in-progress: false

jobs:
  backfill:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.FETCH_PUSH_TOKEN }}
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - name: Run backfill scraper
        id: scrape
        run: npm run backfill -w scraper -- ${{ inputs.source }}
      - name: Commit and push new data
        run: |
          if git diff --quiet -- data/; then
            echo "Backfill produced no new articles."
            exit 0
          fi
          git config user.name "fetch-bot"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/
          git commit -m "data: backfill ${{ inputs.source }} (+${{ steps.scrape.outputs.added }} articles)"
          git push
```

(If Task 11 or 12 concluded a backfill is not feasible, remove that source from the `options` list.)

- [ ] **Step 4: Commit, push, and verify a manual run**

```bash
git add .github/workflows/fetch.yml .github/workflows/backfill.yml
git commit -m "ci: daily fetch and manual backfill workflows"
git push
```

Then trigger a run: `gh workflow run "Fetch articles" && gh run watch`.
Expected: green run; the job summary shows the per-source result table; if new articles appeared since the Task 9 seed, a `data: fetch ...` commit lands on `main` — and (after Task 23) that push triggers a deploy.

---

### Task 23: Deploy workflow + Pages setup

**Files:**

- Create: `.github/workflows/deploy.yml`

**Interfaces:**

- Consumes: `npm run build -w frontend` (Task 13), whose `prebuild` runs the data merge (Task 14); output directory `frontend/dist`.
- Produces: the live site at `https://rulerchen.github.io/engineer-blog/`, redeployed on every push to `main` including fetch-bot data commits.

- [ ] **Step 1: Enable Pages via Actions (manual, one-time)**

Repo → Settings → Pages → Build and deployment → Source: **GitHub Actions**.

- [ ] **Step 2: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - name: Merge data and build frontend
        run: npm run build -w frontend
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: frontend/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Commit, push, and verify the live site**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: deploy frontend and data to github pages"
git push
```

Then: `gh run watch` until the Deploy run is green, and open `https://rulerchen.github.io/engineer-blog/`.
Expected: the site loads with the seeded articles; search, filters, date presets, URL sharing, and "Load more" all work; article links open the original posts in a new tab.

- [ ] **Step 4: End-to-end sanity check of the whole system**

- `gh workflow run "Fetch articles"` → green; any new data commit triggers Deploy automatically (this proves the PAT wiring — if Deploy does not trigger, the push used the wrong token).
- CI did **not** run on the data commit (paths filter works).
- Run the full local suite once more from the repo root: `npm run lint && npm run format && npm run typecheck && npm test` — all green, matching CI exactly.

---

## Verification Checklist (run after the final task)

- [ ] `npm run lint && npm run format && npm run typecheck && npm test` all pass from the repo root.
- [ ] `data/articles/` has one JSON file per source, newest-first, pretty-printed.
- [ ] Daily fetch commits use the `data: fetch YYYY-MM-DD (+N articles)` format and trigger deploys.
- [ ] The live site's search, company/tag/date filters, URL state sharing, "New" badges, and Load more all behave as specified.
- [ ] Backfill runs only via manual dispatch and is polite (sequential + delay + honest UA).
- [ ] No out-of-scope features crept in (no router, no search library, no full-text storage).
