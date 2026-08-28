# engineer-blog

A hand-curated reading list of engineering writing. Everything is added deliberately — there is no scraper. `data/entries.json` is the single source of truth, and a Vue single-page app renders it as a searchable, filterable feed deployed to GitHub Pages.

This used to aggregate ~30 company RSS feeds automatically. That produced a lot of volume and very little signal, so the scraper was removed in favor of adding things by hand through the UI, and the repo collapsed from a monorepo into a plain frontend project.

## Adding an entry

Hit **+ Add** in the site header. The form takes a title, URL, date, source, series, and tags, and offers two ways to save:

- **Commit to GitHub** — commits the new record straight to `data/entries.json` via the GitHub Contents API. The push triggers the deploy workflow, so the entry is live in about a minute. Needs a token (below).
- **Copy JSON** — copies the record to your clipboard so you can paste it into the `data/entries.json` array yourself. No token, no setup.

Either way the entry shows up in the list immediately, flagged **Pending deploy** until the rebuild actually publishes it.

## Data format

`data/entries.json` is an array of records. Only `title`, `url`, and `publishedAt` are required; `id` is derived from the URL at build time and never stored, so re-adding the same URL updates the existing entry instead of duplicating it.

```json
[
  {
    "title": "Attention Is All You Need",
    "url": "https://arxiv.org/abs/1706.03762",
    "source": "Google",
    "publishedAt": "2017-06-12",
    "series": "google-transformers",
    "tags": ["ml", "ai"]
  }
]
```

| Field         | Notes                                                                |
| ------------- | -------------------------------------------------------------------- |
| `source`      | The company the entry came from.                                     |
| `publishedAt` | `YYYY-MM-DD` or a full ISO timestamp.                                |
| `series`      | Optional slug. See below.                                            |
| `tags`        | Free-form. The form suggests tags already in use, but anything goes. |

The file is hand-editable — deleting an entry means deleting its object, which is why there is no separate exclusion list any more.

## Series

Give each part of a sequel the same `series` slug and the cards link up: `Discord message storage · Part 1 of 2`, with links to the parts either side, and clicking the name filters the list to that series in reading order. Order comes from `publishedAt` — there is no ordering field and no separate index.

Scope the slug to its blog (`discord-message-storage`, not `storing-messages`) or it collides the moment another company writes about the same thing. Slugs normalize like tags, the display name is derived from them, and a slug used by only one entry is ignored — so a typo quietly does nothing.

## Development

```sh
npm install
npm run dev          # builds articles.json, then serves the site
npm run lint && npm run format && npm run typecheck
```

A single package at the repo root — no workspaces, no git hooks, no test suite. `npm run lint`, `format`, and `typecheck` are the same three checks CI runs, so run them yourself before pushing.

```
src/          Vue app — components, composables, lib
scripts/      buildEntries.ts, articleId.ts (node-only, build time)
data/         entries.json — the content
public/       generated articles.json (git-ignored)
```

`scripts/buildEntries.ts` compiles `data/entries.json` into `public/articles.json`. It runs automatically before `dev` and `build`, or on demand via `npm run build-data`.

Deploys happen on every push to `main` via `.github/workflows/deploy.yml`.
