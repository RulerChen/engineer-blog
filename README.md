# engineer-blog

A hand-curated reading list of engineering writing. Everything is added deliberately — there is no scraper. `data/entries.json` is the single source of truth, and a Vue single-page app renders it as a searchable, filterable feed deployed to GitHub Pages.

## Development

```sh
npm install
npm run dev          # builds articles.json, then serves the site
npm run lint && npm run format && npm run typecheck
```

A single package at the repo root — no workspaces, no git hooks, no test suite. `npm run lint`, `format`, and `typecheck` are the same three checks CI runs, so run them yourself before pushing.

```
src/          Vue app — components, composables, lib
scripts/      buildEntries.ts, fetchIcons.ts, articleId.ts (node-only, build time)
data/         entries.json — the content
public/       icons/ — cached source icons, named after the entry's `source` (committed); articles.json (git-ignored)
```

`scripts/buildEntries.ts` compiles `data/entries.json` into `public/articles.json`. It runs automatically before `dev` and `build`, or on demand via `npm run build-data`.

`scripts/fetchIcons.ts` fills `public/icons/` — one file per `source`, named after it. It asks two brand-SVG sets for the company's drawn logo (Iconify's `logos`, then svgl) before falling back to scraping the blog's own favicon, and turns down a wordmark or a mark drawn for one theme only. A monochrome logo is saved as a `name.svg` / `name.dark.svg` pair the card swaps by theme. Any file you drop in by hand wins over all of it, for good.

Deploys happen on every push to `main` via `.github/workflows/deploy.yml`.
