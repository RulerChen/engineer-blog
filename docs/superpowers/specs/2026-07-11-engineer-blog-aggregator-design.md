# Engineer Blog Aggregator — Design

**Date:** 2026-07-11
**Status:** Approved for planning

## Overview

A static website that aggregates articles from big-tech engineering blogs and lets
users search and filter them by title/summary text, company, tags, and publish date.

- **Hosting:** GitHub Pages (static, no backend).
- **Data collection:** GitHub Actions runs a fetch pipeline daily. RSS is the primary
  fetch strategy; per-source HTML scrapers provide one-time archive backfill where
  feasible.
- **Storage:** JSON files committed to the repo — the repo is the database. RSS feeds
  only expose recent items, so the committed archive grows with each daily run.
- **Search scope:** metadata only (title, summary, tags, company, date). Full article
  bodies are never fetched or stored.

## Repository Layout

```
engineer-blog/
├── scraper/                  # Node.js + TypeScript fetch pipeline (runs in CI)
│   ├── sources/              # source registry; one module per source
│   └── src/                  # fetcher interface, RSS fetcher, merge/dedup, validation
├── frontend/                 # Vue 3 + Vite SPA
├── data/
│   └── articles/             # committed JSON, one file per source (small diffs)
│       ├── google.json
│       ├── meta.json
│       └── ...
└── .github/workflows/
    ├── ci.yml                # push/PR: lint, format check, typecheck, tests
    ├── fetch.yml             # daily cron: run scraper → commit new data
    ├── backfill.yml          # manual dispatch: run a source's backfill scraper
    └── deploy.yml            # on push to main: build frontend + data → GitHub Pages
```

One language (TypeScript) end to end. Vitest is the test runner for both packages.

## Data Model

```ts
interface Article {
  id: string;                // sha1 of normalized URL — stable dedup key
  title: string;
  url: string;
  source: string;            // source id, e.g. "meta"
  publishedAt: string;       // ISO 8601
  tags: string[];            // from RSS categories or scraped labels; may be empty
  summary: string;           // RSS description, HTML-stripped, truncated to ~300 chars
  thumbnail: string | null;  // cover image URL if the feed provides one
  fetchedAt: string;         // ISO 8601, first time this article was seen
}
```

**URL normalization** (input to the `id` hash and dedup): lowercase host, strip
fragment, strip trailing slash. Query parameters are kept as-is in v1.

### Merge & dedup rules

- Dedup key: `id` (normalized URL hash).
- **Fresh data wins:** on re-fetch, an incoming article overwrites the stored entry
  field-by-field (title fixes, added tags, updated summaries propagate) — **except
  `fetchedAt`**, which always keeps its original first-seen value.
- Result is sorted newest-first by `publishedAt` and written back to
  `data/articles/<source>.json`.
- Merge is a pure function: `merge(existing: Article[], fetched: Article[]): Article[]`.

## Sources & Fetchers

### Source registry

```ts
interface Source {
  id: string;                          // "google", "meta", ...
  name: string;                        // "Meta Engineering"
  fetch: () => Promise<Article[]>;     // daily strategy (RSS for all v1 sources)
  backfill?: () => Promise<Article[]>; // optional one-time archive scraper
}
```

Two building blocks compose per source:

1. **Generic RSS fetcher** — wraps `rss-parser`; takes a feed URL and source id,
   returns normalized `Article[]`. Used by every v1 source for the daily run.
2. **Per-source backfill scrapers** — `cheerio` over paginated archive HTML. Run
   manually only (see Workflows). Sequential requests with a small delay between
   pages and an honest User-Agent string.

### Starter sources (v1)

| id      | Blog                              | Daily fetch | Backfill scraper            |
|---------|-----------------------------------|-------------|-----------------------------|
| google  | developers.googleblog.com         | RSS         | Yes — paginated archive     |
| meta    | engineering.fb.com                | RSS         | Yes — WordPress archive     |
| netflix | netflixtechblog.com (Medium)      | RSS         | No — Medium blocks scraping |
| uber    | uber.com/blog/engineering         | RSS         | Yes — paginated listing     |
| airbnb  | medium.com/airbnb-engineering     | RSS         | No — Medium blocks scraping |

Exact feed URLs are verified during implementation; if a listed feed has moved,
the working feed for the same blog is substituted.

Adding a source later = adding one entry (and optionally one scraper module) to
`scraper/sources/` — no other code changes.

### Validation

Every fetched article passes a schema check before merging: valid absolute URL,
non-empty title, parseable date. Invalid entries are dropped and logged.

## Frontend (Vue 3 + Vite)

Single-page app, one list view, no router in v1.

- **Header:** site title + stats line (article count, source count, last-updated date).
- **Search bar:** case-insensitive substring match over title + summary, debounced.
  Runs in-memory over the full dataset — no search library in v1 (a few thousand
  metadata records filter in well under a frame).
- **Filters:** company multi-select with per-company counts; tag multi-select showing
  the 30 most frequent tags with counts (tag vocabularies vary across feeds); date range via quick presets (last week / month / year)
  plus custom range.
- **Article list:** cards with thumbnail (when present), title linking to the original
  article (opens in new tab), company badge, publish date, tags, summary preview.
  Newest first. A "New" badge appears when `fetchedAt` is within the last 24 hours.
  "Load more" pagination keeps the DOM small.
- **Shareable state:** search text and all filter selections sync to the URL query
  string.

**Components:** `App` → `SearchBar`, `FilterPanel`, `ArticleList` → `ArticleCard`.
Filtering/search logic lives in a plain TypeScript composable (`useArticleFilter`)
built from pure functions, unit-testable without mounting components.

**Data loading:** the deploy build merges `data/articles/*.json` into a single
`articles.json` placed in the Vite output; the app fetches it once on load.
`base` in Vite config is set to the repo name for GitHub Pages pathing.

## Workflows

### `fetch.yml` — daily
- Triggers: cron at 02:00 UTC + `workflow_dispatch`.
- Steps: checkout → install → run scraper over all sources → if `data/` changed,
  commit (`data: fetch 2026-07-11 (+12 articles)`) and push to `main`.
- The push uses a token configuration that triggers `deploy.yml` (the default
  `GITHUB_TOKEN` does not trigger downstream workflows; a fine-grained PAT or
  GitHub App token is used instead).

### `backfill.yml` — manual only
- Trigger: `workflow_dispatch` with a `source` input.
- Runs that source's `backfill()` scraper and commits results the same way.
- Never runs on cron — keeps daily runs fast and polite to target sites.

### `deploy.yml`
- Trigger: push to `main` (including data commits from the fetch workflow).
- Steps: merge per-source JSON → build Vue app → deploy via `actions/deploy-pages`.

### `ci.yml` — quality checks
- Trigger: push to `main` and pull requests. Skipped for data-only commits from the
  fetch bot (paths filter excludes `data/**`).
- Checks, each a separate step so failures are easy to read (oxc toolchain
  throughout, except type checking, which oxc does not provide):
  - **Lint:** `oxlint` over both packages (with Vue support for `frontend/`).
  - **Format:** `oxfmt --check` (beta as of mid-2026; formats TS, Vue SFCs, JSON,
    YAML, Markdown — a formatter upgrade may occasionally require a re-format
    commit).
  - **Typecheck:** `tsc --noEmit` for `scraper/`, `vue-tsc --noEmit` for `frontend/`.
  - **Tests:** Vitest suites for both packages.
- The frontend builds on Vite 8, whose default Rolldown bundler and oxc transforms
  keep the build pipeline oxc-based with no extra configuration.
- The same commands are exposed as root package scripts (`lint`, `format`,
  `typecheck`, `test`) so local runs match CI exactly.

## Error Handling

- **Per-source isolation:** each source fetch runs in its own try/catch. A failing
  source logs the error, leaves its existing data untouched, and the run continues.
- **Job summary:** the fetch workflow writes a per-source result table
  (fetched / new / failed) to the GitHub Actions job summary.
- **Run status:** the workflow fails (red X) only if *every* source fails —
  systemic problems are visible, per-source flakiness is not noisy.
- **Breakage guard:** if a previously healthy source returns 0 articles, log a
  warning and keep existing data — never wipe a source's archive.

## Testing

- **Scraper (Vitest):**
  - Fixture-based parser tests: saved RSS XML and archive HTML snippets in the
    repo; assert the parsed `Article[]` output.
  - Unit tests for merge/dedup: fresh-wins overwrite, `fetchedAt` preservation,
    URL normalization and hashing, sort order.
  - Validation tests: malformed entries are dropped, valid ones pass.
- **Frontend (Vitest):**
  - Unit tests for `useArticleFilter`: search matching, company/tag/date filter
    combinations, URL-state round-tripping.
  - One smoke component test: the list renders from sample data.

## Out of Scope (v1)

- Full article text fetching or indexing.
- Search libraries / pre-built indexes (Lunr, Pagefind) — revisit if the dataset
  or search needs outgrow in-memory filtering.
- Scraping Medium-hosted blogs beyond their RSS window.
- User accounts, bookmarks, dark-mode toggles, RSS output feed, analytics.
