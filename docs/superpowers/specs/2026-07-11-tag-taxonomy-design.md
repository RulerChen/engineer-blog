# Tag Taxonomy Redesign

## Problem

Article tags are currently raw RSS `<category>` values, ingested verbatim
(`.trim()` only) from each source blog's own ad-hoc taxonomy
(`scraper/src/rss.ts`). Across 29 articles from 4 sources this produces 69
distinct tag strings, most occurring once or twice, with heavy
inconsistency and duplication: casing variants (`ai` vs `AI Research`),
format variants (`Open Source` vs `open-source`), and near-duplicate
concepts (`data` vs `big-data` vs `data-engineering`). The "top tags"
filter in the frontend is mostly noise as a result.

The user plans to add more source blogs over time, so the fix must not
require code changes every time a new company is scraped — only when a
genuinely new topic domain appears.

## Goals

- Replace the free-text raw tag pipeline with a fixed, curated set of
  canonical tags (~24 tags, hard ceiling well under 50).
- Normalize at scrape time (in `scraper/`), so the frontend and the
  persisted JSON data always contain clean canonical tags — no raw noise
  ever reaches `frontend/`.
- Make the mapping mechanism extensible: adding a new source blog should
  "just work" for most of its categories without a code change, via
  keyword-based fallback rules, while remaining fully predictable via an
  explicit static table for known cases.
- Never silently misclassify — unmapped raw tags are dropped from the
  article (not guessed at) and surfaced in a review log for a human to
  triage.

## Non-goals

- No database, no many-to-many relational tag store — the project stays
  flat-JSON.
- No per-tag detail pages / routes — tags remain a filter-only dimension
  in the frontend, same as today.
- No changes to the separate `source`/company filter dimension
  (`frontend/src/lib/sources.js`), which is already clean and out of scope.
- No retroactive re-tagging mechanism in the frontend — normalization
  happens once, at scrape time, on the data as scraped.

## Design

### Canonical tag list (24 tags)

`frontend`, `backend`, `mobile`, `ai`, `ml`, `data`, `infra`, `databases`,
`observability`, `architecture`, `security`, `devops`, `open-source`,
`culture`, `video`, `ar-vr`, `experimentation`, `networking`, `career`,
`product`, `performance`, `testing`, `cloud`, `general`.

`general` is an explicit catch-all for raw tags that carry no real topic
signal (e.g. `engineering`, `technology`, or a bare company name like
`netflix`) — distinct from the "unmapped" case, which is for tags that
_do_ carry signal but aren't yet classified.

Several tags (`networking`, `career`, `product`, `performance`, `testing`,
`cloud`) have no current raw-tag matches but are included up front because
they are common topics across engineering blogs generally and are likely
to appear as soon as a second wave of source blogs is added.

### Mapping pipeline

New module: `scraper/src/tags.ts`, invoked from `scraper/src/rss.ts` at the
point tags are currently populated (replacing the current
`tags: (item.categories ?? []).map(c => c.trim()).filter(Boolean)` with a
call into this module).

Resolution order per raw tag:

1. **Exact-match static table** — `Record<string, CanonicalTag>` keyed on
   the lowercased/trimmed raw tag string. Covers all 69 currently-known raw
   tags explicitly, so today's tags map deterministically with no reliance
   on keyword heuristics.
2. **Keyword/substring fallback rules** — an ordered array of
   `{ pattern: RegExp, tag: CanonicalTag }`, tried only when step 1 misses.
   Predictable future variants across new source blogs (e.g.
   `/kubernetes|k8s/i` → `infra`, `/android|ios/i` → `mobile`,
   `/machine.?learning/i` → `ml`) are caught here without needing a table
   entry per company's exact spelling.
3. **Unmapped** — if neither step matches, the raw tag contributes nothing
   to that article's canonical tags. The raw string, the source blog it
   came from, and the number of affected articles are collected during the
   scrape run and written to a review artifact (e.g.
   `data/unmapped-tags.json`) plus a console warning summary at the end of
   the scrape.

Per article, resulting canonical tags are deduplicated (an article whose
raw tags were `["Android", "android-dev"]` collapses to `["mobile"]`, not
two separate entries).

### Data & frontend impact

`Article.tags: string[]` (in both `scraper/src/types.ts` and
`frontend/src/types.ts`) keeps its existing shape — only the _values_
change, from raw strings to canonical tags. This means:

- `data/articles/*.json` and the bundled `frontend/public/articles.json`
  regenerate with canonical tags on the next scrape run.
- No structural changes needed in `frontend/src/lib/filter.ts`,
  `frontend/src/composables/useArticleFilter.ts`,
  `frontend/src/lib/urlState.ts`, `frontend/src/components/FilterPanel.vue`,
  or `frontend/src/components/ArticleCard.vue` — they already operate on
  `tags: string[]` generically.
- `topTags()`'s "top 30" cap in `filter.ts` becomes effectively moot (there
  are only 24 possible tags total) but is left as-is since it's harmless
  and doesn't need to change for this work.

### Extensibility for future source blogs

Adding a new company blog does not require touching `tags.ts` in the
common case: its RSS categories flow through the same static-table →
keyword-rule pipeline automatically, and most real-world engineering-blog
vocabulary (kubernetes, android, ml, security, etc.) is already covered by
the keyword rules. `tags.ts` only needs an edit when the unmapped-tags
report surfaces a new raw tag worth naming (either adding it to the static
table for an exact fix, or generalizing a keyword rule if a pattern of
similar unmapped tags emerges).

## Testing

- Unit tests for `scraper/src/tags.ts` covering: exact-match table hits,
  keyword-rule fallback hits, unmapped tags being dropped and logged,
  case-insensitivity, and dedup of multiple raw tags mapping to the same
  canonical tag.
- A snapshot-style test asserting all 69 currently-known raw tags (from
  the existing `data/articles/*.json`) resolve to a canonical tag via step
  1 or 2, i.e. none of today's real tags land in the "unmapped" bucket.
