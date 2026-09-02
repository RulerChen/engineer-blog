# engineer-blog

A hand-curated reading list of engineering writing. Everything is added deliberately — there is no scraper. The files in `data/` are the single source of truth, and a Vue single-page app renders them as a searchable, filterable feed deployed to GitHub Pages.

## Development

```sh
npm install
npm run dev          # builds articles.json, then serves the site
npm run lint && npm run format && npm run typecheck
```
